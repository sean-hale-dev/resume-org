const { MongoClient, ObjectID } = require('mongodb');
const dotenv = require('dotenv').config();

// Performs intersection operation between called set and otherSet
//
// FUNCTION GRABBED FROM https://www.geeksforgeeks.org/sets-in-javascript/
Set.prototype.intersection = function (otherSet) {
  // creating new set to store intersection
  var intersectionSet = new Set();

  // Iterate over the values
  for (var elem of otherSet) {
    // if the other set contains a
    // similar value as of value[i]
    // then add it to intersectionSet
    if (this.has(elem)) intersectionSet.add(elem);
  }

  // return values of intersectionSet
  return intersectionSet;
};

// Perform union operation between
// called set and otherSet
//
// FUNCTION GRABBED FROM https://www.geeksforgeeks.org/sets-in-javascript/

Set.prototype.union = function (otherSet) {
  // creating new set to store union
  var unionSet = new Set();

  // iterate over the values and add
  // it to unionSet
  for (var elem of this) {
    unionSet.add(elem);
  }

  // iterate over the values and add it to
  // the unionSet
  for (var elem of otherSet) unionSet.add(elem);

  // return the values of unionSet
  return unionSet;
};

Set.prototype.symmetricDifference = function (otherSet) {
  let _difference = new Set(this);
  for (let elem of otherSet) {
    if (_difference.has(elem)) {
      _difference.delete(elem);
    } else {
      _difference.add(elem);
    }
  }
  return _difference;
};

/*
 * VOCAB:
 * query -> A string of skills joined by logical operators and grouped in parenthesis ( &, *, | ) i.e. ((a & b) | (c * d))
 * chunk -> An element of a query which is enclosed in parenthesis i.e. ( a & b )
 * component -> A skill in a chunk i.e. (a)
 * macro -> A substituted chunk in a query represented by the form "$<macroID>$". i.e. $1$ = a & b --> ($1$ | (c * d))
 */

/*
 * Function responsible for parsing an individual chunk of a query into a query object
 * query obj = { operation: "<and/or/xor>", "containsMacros": <true/false>, components:[ {token: <name of component> isMacro:<true/false>} ]}
 */
function parseString(group) {
  var searchParams = {
    operation: '',
    containsMacros: false,
    components: [],
  };

  // Select skill tokens from raw chunk
  tokenSelect = /([\w\d!.\$][\w\d .+-]*[\w\d\$+-.])|(?<=[ \|&\*])\w(?=[ \|&\*])|(?<=[ \|&\*])\w|\w(?=[ \|&\*])/gi;
  group = group.replace(/! /g, '!');
  tokens = group.match(tokenSelect);
  // If tokens were selected, parse and store
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

/*
 * Function responsible for parsing query strings
 */
function parseQuery(query) {
  var chunks = [];

  var curID = 1;
  var managedString = query;

  // Seperate and parse a chunk, store the chunk obj, and then replace the chunk with a macro in the query
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

    // Detect and isolate grouped chunk
    for (let i = 0; i < managedString.length; i++) {
      if (managedString[i] == '(') startChunkIDX = i;
      if (managedString[i] == ')') {
        endChunkIDX = i;
        break;
      }
    }

    // Handle errors in chunk detection
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

  // Parse the query while groups remain
  while (/[\(\)]/g.test(managedString)) {
    parseChunk(0, managedString.length);
  }
  curID = 0;
  // Parse the root macro
  parseChunk(0, managedString.length);
  return chunks;
}

// Function which takes in a parsed query obj and calculates the query from mongo
async function handleQuery(queryObj) {
  var respTable = {};
  var keys = [];
  var macrosTable = {};

  var response = {};

  // Construct initial lookup tables
  queryObj.map((obj) => {
    obj.ops.components.map((component) => {
      if (!component.isMacro) keys.push(component.token);
      else macrosTable[component.token] = null;
    });
  });

  // Grab resume _id's from mongo with the keyset
  const fetchFromMongo = async (tokenArr) => {
    const mongoClient = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    let mgdbRetObj = [];

    try {
      await mongoClient.connect();
      let mgdbQueryObj = { $or: [] };
      tokenArr.map((t) => mgdbQueryObj['$or'].push({ name: t }));
      mgdbRetObj = await mongoClient
        .db('resume_org')
        .collection('searchTesting')
        .find(mgdbQueryObj, { _id: 0 })
        .toArray();
    } catch (err) {
      console.error(err);
    } finally {
      mongoClient.close();
      return mgdbRetObj;
    }
  };

  // Parse mongo response into sets and store
  var resp = await fetchFromMongo(keys);
  if (resp.length == 0) {
    response.status = -1;
    response.message = 'ERROR: No valid skills provided';
    return response;
  }

  resp.map((respObj) => (respTable[respObj.name] = new Set(respObj.resumes)));

  // Recursivly calculate a chunk, starting with non-macro chunks and working up to the root chunk.
  const resolveChunk = (chunk) => {
    // If chunk has unresolved macros, first resolve before continuing
    chunk.ops.components.map((component) => {
      if (component.isMacro && macrosTable[component.token] == null) {
        let nextChunkIDX = component.token.slice(1, component.token.length - 1);
        macrosTable[component.token] = resolveChunk(queryObj[nextChunkIDX]);
      }
    });

    // Construct return set and calculate chunk
    let chunkResp = null;
    chunk.ops.components.map((component) => {
      if (chunkResp == null) {
        chunkResp = component.isMacro
          ? macrosTable[component.token]
          : respTable[component.token];
      } else {
        let comparisonSet = component.isMacro
          ? macrosTable[component.token]
          : respTable[component.token];

        if (comparisonSet == null) comparisonSet = new Set();

        // Perform chunk calculation
        if (chunk.ops.operation == 'and')
          chunkResp = chunkResp.intersection(comparisonSet);
        if (chunk.ops.operation == 'or')
          chunkResp = chunkResp.union(comparisonSet);
        if (chunk.ops.operation == 'xor')
          chunkResp = chunkResp.symmetricDifference(comparisonSet);
      }
    });
    return chunkResp;
  };

  let result = resolveChunk(queryObj[0]);
  response.status = 0;
  response.message = 'Returning result';
  response.payload = result;
  return response;
}

const search = async (searchString) => {
  let response = {};
  if (process.env.MONGO_URI == null) {
    console.error(
      '<SEARCH> ERROR: Unable to resolve MONGO_URI environmental variable... cannot connect to database'
    );
    response.status = -1;
    response.message = 'ERROR: Missing MONGO_URI env. var';

    return response;
  }

  if (searchString == null) {
    console.error('<SEARCH> ERROR: No query string provided');
    response.status = -1;
    response.message = 'ERROR: No query string provided';

    return response;
  }

  searchString = searchString.toLowerCase();
  let resp = parseQuery(searchString);
  response = await handleQuery(resp);

  console.log(response);
  return response;
};

let searchQuery = 'ReAct';
console.log('Searching: ' + searchQuery);
search(searchQuery);
