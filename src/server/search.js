const { MongoClient, ObjectID } = require('mongodb');
const dotenv = require('dotenv').config();

function parseString(group) {
  var searchParams = {
    operation: '',
    containsMacros: false,
    components: [],
  };

  tokenSelect = /([\w\d!.\$][\w\d .+-]*[\w\d\$+-.])|(?<=[ \|&\*])\w(?=[ \|&\*])|(?<=[ \|&\*])\w|\w(?=[ \|&\*])/gi;
  group = group.replace(/! /g, '!');
  tokens = group.match(tokenSelect);
  if (tokens != null)
    tokens.map((token) => {
      let component = {};
      component.token = token;
      component.isMacro = /\$\d*\$/g.test(token);
      searchParams.components.push(component);
    });

  searchParams.containsMacros = /\$\d*\$/g.test(group);

  if (/&/g.test(group)) searchParams.operation = 'and';
  else if (/\|/g.test(group)) searchParams.operation = 'or';
  else if (/\*/g.test(group)) searchParams.operation = 'xor';

  return searchParams;
}

function parseQuery(query) {
  var chunks = [];

  var curID = 1;
  var managedString = query;

  function parseChunk(startIDX, endIDX) {
    if (/^[^\(\)]*$/g.test(managedString.slice(startIDX + 1, endIDX))) {
      chunks.splice(curID, 0, {
        id: curID,
        ops: parseString(managedString.slice(startIDX, endIDX + 1)),
        resolved: false,
        response: {},
      });
      managedString = managedString.replace(
        managedString.slice(startIDX, endIDX + 1),
        `$$${curID}$$`
      );
      curID += 1;
      return;
    }

    var startChunkIDX = -1;
    var endChunkIDX = -1;

    for (let i = 0; i < managedString.length; i++) {
      if (managedString[i] == '(') startChunkIDX = i;
      if (managedString[i] == ')') {
        endChunkIDX = i;
        break;
      }
    }

    if (
      endChunkIDX <= startChunkIDX ||
      startChunkIDX == -1 ||
      endChunkIDX == -1
    ) {
      console.error('ERROR: Chunk detection failed');
      return;
    }

    parseChunk(startChunkIDX, endChunkIDX);
  }

  while (/[\(\)]/g.test(managedString)) {
    parseChunk(0, managedString.length);
  }
  curID = 0;
  parseChunk(0, managedString.length);
  return chunks;
}

async function handleQuery(queryObj) {
  var respTable = {};
  var keys = [];
  var macrosTable = {};
  queryObj.map((obj) => {
    obj.ops.components.map((component) => {
      if (!component.isMacro) keys.push(component.token);
      else macrosTable[component.token] = null;
    });
  });

  const fetchFromMongo = async (tokenArr) => {
    const mongoClient = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await mongoClient.connect();
      let mgdbQueryObj = { $or: [] };
      tokenArr.map((t) => mgdbQueryObj['$or'].push({ name: t }));
      var resRet = await mongoClient
        .db('resume_org')
        .collection('skill_assoc')
        .find(mgdbQueryObj, { _id: 0 })
        .toArray();
    } finally {
      mongoClient.close();
      return resRet;
    }
  };

  var resp = await fetchFromMongo(keys);
  resp.map((respObj) => (respTable[respObj.name] = new Set(respObj.resumes)));
  console.log(respTable);

  const resolveChunk = (chunk) => {
    chunk.ops.components.map((component) => {
      if (component.isMacro && macrosTable[component.token] == null) {
        let idx = component.token.match(/\d*/g)[0];
        macrosTable.component.token = resolveChunk(idx);
      }
    });

    let chunkResp = null;
    switch (chunk.ops.operation) {
      case 'and':
        chunk.ops.components.map((component) => {
          if (chunkResp == null) chunkResp = respTable[component.token];
          else if (!component.isMacro)
            chunkResp = chunkResp.intersection(respTable[component.token]);
          else chunkResp = chunkResp.intersection(macrosTable[component.token]);
        });
      default:
        break;
    }

    return chunkResp;
  };

  let result = resolveChunk(queryObj[0]);
  return result;
}

const search = async (searchString) => {
  let resp = parseQuery(searchString);
  let queryResp = await handleQuery(resp);
  console.log(queryResp);
};

search('( React & vue ) & angular');
