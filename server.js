const express = require('express')
const multer = require('multer')
const sqlite = require('sqlite3')
const Mux = require('@mux/mux-node')
const fs = require('fs')
const request = require('request')
const axios = require('axios')

sqlite.verbose()
const db = new sqlite.Database('./dev.db')

const app = express()
const PORT = 3000
const MUX_TOKEN_ID = '937459b4-a9f6-4a62-abbc-e94a7b7df150'
const MUX_TOKEN_SECRET = '+RxHshgtfYKiJ23S6YJ1ZxiAFq1nDZDIY5nK3aIe31Aww83UVfAjMkO1sBZELybDbCWOuteagga'

const {Video} = new Mux(MUX_TOKEN_ID, MUX_TOKEN_SECRET)

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
    SELECT id, video_file, address, playback_id
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
app.post('/api/upload', upload.single('video'), async (req, res) => {
  console.log('saving video...')
  const upload = await Video.Uploads.create({
    cors_origin: `http://localhost:${PORT}/`,
    new_asset_settings: {
      playback_policy: 'public'
    }
  })
  const stream = fs.createReadStream(`./uploads/${req.file.filename}`).pipe(request.put(upload.url))
  stream.on('end', async () => {
    try {
      const {data: {data: response}} = await axios.get(`https://api.mux.com/video/v1/uploads/${upload.id}`, {
        headers: {
          "Content-Type": "application/json"
        },
        auth: {
          username: MUX_TOKEN_ID,
          password: MUX_TOKEN_SECRET
        }
      })
      const asset = await Video.Assets.get(response.asset_id)
      db.run(
          `INSERT into uploads
            (address, video_file, original_video_filename, playback_id)
            VALUES (?, ?, ?, ?)`,
        [req.body.address, req.file.filename, req.file.originalname, asset.playback_ids[0].id],
        function () {
          res.redirect(`/uploads/${this.lastID}`)
        })
    } catch (e) {
      console.log(e)
    }
  })
});


app.all('*', (req, res) => {
  console.log('uncaught request to ', req.url)
  res.status(404).end()
})

app.listen(PORT, () => {
  console.log(`Assessment app listening at http://localhost:${PORT}`)
})
