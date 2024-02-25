require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
// const crypto = require('crypto');
const morgan = require('morgan');
const { GridFSBucket } = require('mongodb');
const { ObjectId } = require('bson');

// npm install multer@1.4.4-lts.1

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));

app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  }),
);

const url = process.env.DATABASE;

// mongoose.set('strictQuery', true);

mongoose
  .connect(url)
  .then((con) => {
    console.log('DB connecting successful...');
  })
  .catch((err) => {
    console.log('DB connection ERROR!!');
  });

const db = mongoose.connection;

process.on('unhandledRejection', (error) => {
  console.log('unhandledRejection', error.message);
});

const bucket = new GridFSBucket(db);

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  const fileBuffer = req.file.buffer; // Access the file buffer
  const filename = req.file.originalname;

  const uploadStream = bucket.openUploadStream(filename);
  const id = uploadStream.id;

  uploadStream.end(fileBuffer); // Write the file buffer to the stream

  uploadStream.on('finish', () => {
    res.json({ id: id, filename: filename });
  });

  uploadStream.on('error', (error) => {
    res.status(500).json({ error: 'Error uploading file to GridFS' });
  });
});

app.get('/fileinfo/:fileId', (req, res) => {
  const fileId = new ObjectId(req.params.fileId);

  const downloadStream = bucket.openDownloadStream(fileId);

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename=example.pdf');

  // Pipe the file stream to the response
  downloadStream.pipe(res);
});

app.get('/', (req, res) => {
  res.render('overview');
});

app.listen(4000, () => {
  console.log('Server is running on port 4000');
});