const fs = require('fs')
const path = require('path')
// const LRU = require('lru-cache')
const express = require('express')
// const favicon = require('serve-favicon')
const compression = require('compression')
const resolve = file => path.resolve(__dirname, file)
const router = require('./routes')

const isProd = process.env.NODE_ENV === 'production'
const app = express()

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const Mock = require('mockjs');

app.use(cookieParser('MAGICSTRING'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if ('OPTIONS' == req.method) {
    res.send(204);
  }
  else {
    next();
  }
});


const serve = (path, cache) => express.static(resolve(path), {
  maxAge: cache && isProd ? 1000 * 60 * 60 * 24 * 30 : 0
})

app.use(compression({ threshold: 0 }))
// app.use(favicon('./public/logo-48.png'))
app.use('/dist', serve('./dist', true))
app.use('/public', serve('./public', true))
// app.use('/manifest.json', serve('./manifest.json', true))
// app.use('/service-worker.js', serve('./dist/service-worker.js'))

// since this app has no user-specific content, every page is micro-cacheable.
// if your app involves user-specific content, you need to implement custom
// logic to determine whether a request is cacheable based on its url and
// headers.
// 1-second microcache.
// https://www.nginx.com/blog/benefits-of-microcaching-nginx/
// app.use(microcache.cacheSeconds(1, req => useMicroCache && req.originalUrl))

app.use('/api', router);


const outPutCallback = (err) => {
  res.send(JSON.stringify(err));
}

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log(`method:[${req.method}],req.originalUrl:${req.originalUrl}`);

  if ('OPTIONS' == req.method) {
    res.send(204);
  }
  else {
    next();
  }
});

// for parsing multipart/form-data
// app.use(upload.array());


// app.get('/', (req, res) => res.send('Mongodb online api!'))


const port = process.env.PORT || 8008
app.listen(port, () => {
  console.log(`server started at localhost:${port}`)
})
