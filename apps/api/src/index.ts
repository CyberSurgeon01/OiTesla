import express from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('OiTesla API is running!');
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
