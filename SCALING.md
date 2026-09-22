# Scaling OiTesla: From MVP to 1 Million Passengers

This document outlines the architectural evolution required to scale OiTesla from a local MVP to a massive production system supporting **1M concurrent passengers and 100k active drivers** across Dhaka.

## 1. High-Level Target Architecture
```mermaid
flowchart TD
    Client[Mobile Apps & Web] -->|HTTPS/WSS| LB[Global Load Balancer / API Gateway]
    
    subgraph Services [Stateless Microservices]
        LB --> MatchService[Matchmaking Service]
        LB --> RideService[Ride Lifecycle Service]
        LB --> DriverService[Driver Location Service]
        LB --> Notification[WebSocket / Push Service]
    end

    subgraph Data Layer [Data & Cache]
        MatchService -->|Pub/Sub| Kafka[Kafka Event Bus]
        DriverService --> RedisGeo[Redis (Geospatial)]
        RideService --> DB_Master[(PostgreSQL Master)]
        DB_Master -->|Async Repl| DB_Replica[(PostgreSQL Read Replicas)]
    end
```

## 2. Statelessness & Horizontal Scaling
To handle 1M passengers, the Express API must be entirely stateless. Session state (JWTs) is already stateless. We will deploy the backend as auto-scaling containerized microservices (e.g., Kubernetes / EKS) behind an API Gateway/Load Balancer. As traffic spikes during rush hour, horizontal pod autoscalers will spin up additional nodes.

## 3. Geospatial Search & Ride Matching
The MVP's static zone compatibility (Banani → Mohakhali) falls apart at scale. 
- **Evolution**: Drivers will stream live GPS coordinates every 3-5 seconds. 
- **Technology**: We will replace PostgreSQL for location lookups with **Redis Geospatial Indexes (GeoHash)** or **Elasticsearch**. 
- **Matching Strategy**: The matching engine will pull nearby active vehicles using a radius query, calculate routes using an external Maps API (e.g., OSRM or Google Maps routing), and evaluate capacity and route overlap dynamically. 

## 4. Database Indexing & Read Replicas
Currently, the MVP hammers a single PostgreSQL instance. 
- **Indexes**: We will enforce B-Tree indexes on `(status, vehicle_id)` and `(passenger_id, status)` to rapidly filter active rides.
- **Read Replicas**: The driver and passenger history dashboards (which are read-heavy) will be routed exclusively to asynchronous Read Replicas, entirely removing historical query load from the Master database.

## 5. Mitigating Database Contention
At 1M passengers, using `SELECT ... FOR UPDATE` directly on the `Vehicle` table for every single ride request will cause catastrophic lock contention and deadlocks.
- **Queue-Based Matching**: Instead of immediate synchronous locking, incoming ride requests will drop onto a **Kafka / RabbitMQ** queue. A pool of dedicated Matching Workers will dequeue requests, evaluate geospatial proximity, and batch-assign passengers to vehicles using an optimistic lock or memory-based locking mechanism (Redis Redlock), vastly reducing PostgreSQL bottlenecking.

## 6. Real-Time Communication (WebSockets)
Polling the API every 5 seconds (as done in the MVP) creates overwhelming unnecessary traffic.
- **Evolution**: We will implement a WebSocket cluster (e.g., using Socket.io or native WebSockets + Redis Pub/Sub adapter). Passengers and drivers will maintain a persistent connection. When a matching worker successfully assigns a ride, it publishes a Kafka event, which the WebSocket service broadcasts instantly to the specific passenger and driver.

## 7. Caching
- **Hot Data**: Driver statuses and vehicle capacities will be aggressively cached in **Redis**. Instead of querying the database for "how many seats are left," the matching engine will read an atomic integer in Redis. The PostgreSQL database will act only as the persistent source of truth, updated asynchronously.

## 8. Rate Limiting & Security
- **API Gateway**: Tools like Kong or AWS API Gateway will enforce strict rate limiting per JWT/IP to prevent DDoS attacks and spam (e.g., preventing a malicious user from requesting 100 rides per second).
- **Idempotency**: Critical endpoints (like Payment or Ride Booking) will require `Idempotency-Key` headers. If a passenger's network drops exactly as they book, they can safely retry the request without accidentally booking two separate rides.

## 9. Queues, Events, & Failure Handling
- **Event-Driven Architecture**: Transitions like `COMPLETED` will emit events. Downstream consumer services (like Payments and Analytics) will listen to these events.
- **Retry Mechanisms**: If the Payment Service fails to deduct a TeslaPay wallet, it doesn't crash the ride. The event goes to a **Dead Letter Queue (DLQ)**, where exponential backoff retry mechanisms will attempt to process the payment later.

## 10. Observability
At this scale, `console.log` is useless.
- **Metrics & Tracing**: We will use Prometheus + Grafana for monitoring system health (CPU, memory, DB connections). We will implement OpenTelemetry for distributed tracing, ensuring we can track a request ID seamlessly as it hops from the API Gateway → Matching Queue → DB.
- **Centralized Logging**: All services will stream logs to ELK (Elasticsearch, Logstash, Kibana) or Datadog.

## 11. Deployment Strategy
- **Zero-Downtime Deployments**: Deployments will utilize Blue/Green or Canary releases via Kubernetes to ensure the 100k drivers never drop connection during a software update. Database migrations will be strictly backward-compatible and decoupled from application code deployments.
