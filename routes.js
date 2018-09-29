const express = require('express');
const router = express.Router(); 
const db = require('./db');
const { dataBase } = require('./config/database')
const { getNextSequenceValue, getCityEntityByHostName, getCityEntity } = require('./utils/tools');

var multer = require('multer');
// const cookieParser = require('cookie-parser');
// const session = require('express-session');

var upload = multer();
var ObjectId = require('mongodb').ObjectId


const removeProcessor = (data) => {
  const avliableKeys = {}
  Object.keys(data).filter(a => !a.startsWith('$')).forEach(a => {
    avliableKeys[a] = data[a];
  })

  return avliableKeys;
}


const dbAction = {
  Ids: (city, date) => {
    return new Promise((resolve, reject) => {
      db.open(dataBase).then(dbo => {
        return dbo.collection('posts').find({ city, date }).project({ '_id': 1 }).toArray()
      }).then(resolve).catch(reject).finally(() => {
        db.close()
      })
    })
  },
  post: async (rows, city, date) => {
    return new Promise((resolve, reject) => {
      db.open(dataBase).then((dbo) => dbo.createCollection('posts')).then(r => {
        const method = Array.isArray(rows) ? 'insertMany' : 'insertOne';

        if (Array.isArray(rows)) {
          rows.forEach(a => {
            // a._id = getNextSequenceValue(dbo, 'postId')
            a.city = city;
            a.date = date;
          })
        } else {
          rows.city = city
          rows.date = date
        }

        return r[method](rows);
      }).then(resolve).catch(reject).finally(() => {
        db.close();
      })

    })
  },
  get: async (data) => {

    return new Promise((resolve, reject) => {
      db.open(dataBase).then((dbo) => dbo.collection('posts')).then(r => {

        if (data._id) {
          data._id = ObjectId(data._id);
        }

        let execute = r.find(removeProcessor(data) || {});
        let querys = null;
        if (data.$fields) {
          querys = {};
          data.$fields.split(',').forEach(a => querys[a] = 1);

          execute = execute.project(querys)
        }
        if (data.$limit) {
          execute = execute.limit(parseInt(data.$limit))
        }
        if (data.$skip) {
          execute = execute.skip(parseInt(data.$skip))
        }

        return execute.sort({ "time": -1 }).toArray();
      }).then(resolve).catch(reject).finally(() => {
        db.close()
      })
    })
  },
  isExist: (city, date) => {
    return new Promise((resolve, reject) => {
      db.open(dataBase).then(dbo => {
        return dbo.collection('posts').find({ city, date }).limit(1).toArray()
      }).then(resolve).catch(reject).finally(() => {
        db.close()
      })
    })
  }
}

 
router.get('/:table', (req, res) => {
  db.open(dataBase).then((dbo) => {
    const data = req.query;

    if (data._id) {
      data._id = ObjectId(data._id);
    }

    let execute = dbo.collection(req.params.table).find(removeProcessor(data) || {});
    let querys = null;
    if (data.$fields) {
      querys = {};
      data.$fields.split(',').forEach(a => querys[a] = 1);
      execute = execute.project(querys)
    }
    if (data.$limit) {
      execute = execute.limit(parseInt(data.$limit))
    }
    if (data.$skip) {
      execute = execute.skip(parseInt(data.$skip))
    }
    if (data.$sortdesc) {
      const sort = {}
      sort[data.$sortesc] = 1;
      execute = execute.sort(sort)
    }
    if (data.$sort) {
      const sort = {}
      sort[data.$sort] = -1;
      execute = execute.sort(sort)
    }

    return execute.toArray();
  }).then((r) => {
    // setTimeout(() => {
      res.send(JSON.stringify(r));
    // }, Math.random() * 1000);
  }).catch((err) => {
    res.send(JSON.stringify(err));
  }).finally(() => {
    db.close();
  })
})

router.post('/:db/:table', (req, res) => {
  db.open(req.params.db).then((dbo) => dbo.createCollection(req.params.table)).then(r => {
    const obj = req.body;
    const method = Array.isArray(obj) ? 'insertMany' : 'insertOne';

    return r[method](obj);
  }).then((r, o, c) => {
    res.send(JSON.stringify(r));
  }).catch((err) => {
    res.send(JSON.stringify(err));
  }).finally(() => {
    db.close();
  })
})

router.put('/:db/:table', (req, res) => {
  db.open(req.params.db).then((dbo) => {
    const data = req.query;
    if (data._id) {
      data._id = ObjectId(data._id);
    }

    return dbo.collection(req.params.table)
      .updateOne(data || {}, { "$set": req.body });
  }).then((r) => {
    res.send(JSON.stringify(r));
  }).catch((err) => {
    res.send(JSON.stringify(err));
  }).finally(() => {
    db.close();
  })
})


router.delete('/:db/:table', (req, res) => {
  db.open(req.params.db).then((dbo) => {
    const data = req.query;
    if (data._id) {
      data._id = ObjectId(data._id);
    }
    if (!data) throw "cannot find delete prarms";

    return dbo.collection(req.params.table)
      .deleteOne(data);
  }).then((r) => {
    res.send(JSON.stringify(r));
  }).catch((err) => {
    res.send(JSON.stringify(err));
  }).finally(() => {
    db.close();
  })
})

router.post('/:db/:table/upload', upload.any(), (req, res) => {

  db.open(req.params.db).then((dbo) => dbo.createCollection(req.params.table)).then(r => {
    const obj = req.body;
    obj.file = Binary(req.files[0].buffer)

    return r.insert(obj);
  }).then((r, o, c) => {
    res.status(200).send(r.insertedIds);
  }).catch((err) => {
    res.send(JSON.stringify(err));
  }).finally(() => {
    db.close();
  })
})


router.get('/:db/:table/download', (req, res) => {

  db.open(req.params.db).then((dbo) => dbo.createCollection(req.params.table)).then(r => {
    const data = req.query;
    if (data._id) {
      data._id = ObjectId(data._id);
    }

    return r.find(data || {}).toArray()
  }).then(function (documents, err, ) {
    if (err) console.error(err);

    const file = documents[0].file;

    res.writeHead(200, {
      'Content-Type': documents[0].type,
      'Content-disposition': 'attachment;filename=' + encodeURIComponent(documents[0].fileName),
      'Content-Length': documents[0].size
    });
    res.end(new Buffer(file.buffer, 'binary'));

  })
})


module.exports = router;
