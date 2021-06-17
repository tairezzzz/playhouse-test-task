const express = require('express')
const multer = require('multer')
const sqlite = require('sqlite3')

sqlite.verbose()
const db = new sqlite.Database('./dev.db')

const app = express()
const PORT = 3000

app.use('/videos', express.static('uploads'))

app.get('/', (req, res) => {
  res.sendFile('pages/index.html', {root: './'})
})

app.get('/upload', (req, res) => {
  res.sendFile('pages/upload.html', {root: './'})
})

app.get('/uploads/:id', (req, res) => {
  db.get(`
    SELECT video_file, address
    FROM uploads
    WHERE id=?
    LIMIT 1
  `, req.params.id, (err, row) => {
    if (err || !row) {
      res.status(400).send('Bad Request')
      return
    }

    console.log('err', err);
    console.log('row', row);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
      </head>
      <body>
        <h1>Review</h1>
        <h2>Here is your video for ${row.address}</h2>
        <video src="/videos/${row.video_file}" style="max-height:100vh;max-width:100vw" controls></video>
        <br />
        <a href="/">Return Home</a>
        <a href="/upload">Upload Another</a>
      </body>
      </html>
    `)
  })
})

app.get('/api/upload_list', (req, res) => {
  console.log('uploadList');
  db.all(`
    SELECT id, video_file, address
    FROM uploads
    ORDER BY id
  `, (err, rows) => {
    if (err || !rows) {
      res.status(400).send('Bad Request')
      return
    }

    res.json(rows)
  })
})

const upload = multer({dest: 'uploads'})
app.post('/api/upload', upload.single('video'), (req, res) => {
  console.log('saving video...')
  db.run(`
    INSERT into uploads 
    (address, video_file, original_video_filename)
    VALUES (?, ?, ?)
  `, [req.body.address, req.file.filename, req.file.originalname], function () {
    res.redirect(`/uploads/${this.lastID}`)
  })
})

app.all('*', (req, res) => {
  console.log('uncaught request to ', req.url)
  res.status(404).end()
})

app.listen(PORT, () => {
  console.log(`Assessment app listening at http://localhost:${PORT}`)
})