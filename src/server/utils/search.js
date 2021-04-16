const { MongoClient, ObjectID } = require('mongodb');

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

// Function adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
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

// Function adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
Set.prototype.difference = function (otherSet) {
  let _difference = new Set(this);
  for (let elem of otherSet) _difference.delete(elem);
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

  // This is a really dumb little thing that checks to see if the query string is only one character and if so append a space so the tokenSelect will select it
  if (group.length == 1) group += ' ';

  // Select skill tokens from raw chunk
  tokenSelect = /([\w\d!.\$][\w\d .+\$-]*[\w\d\$+-.])|(?<=[ \|&\*])\w(?=[ \|&\*])|(?<=[ \|&\*])\w|\w(?=[ \|&\*])/gi;
  group = group.replace(/! /g, '!');
  tokens = group.match(tokenSelect);
  // If tokens were selected, parse and store
  if (tokens != null)
    tokens.map((token) => {
      let component = {};
      component.isMacro = /\$\d*\$/g.test(token);
      component.isNegated = /!/g.test(token);
      if (component.isNegated) token = token.replace(/!/g, '');
      component.token = token;
      searchParams.components.push(component);
    });
  else
    return {
      status: -1,
      message: 'ERROR: Missing search token(s)',
    };

  searchParams.containsMacros = /\$\d*\$/g.test(group);

  let containsAnd = false,
    containsOr = false,
    containsXor = false;

  containsAnd = /&/g.test(group) ? 1 : 0;
  containsOr = /\|/g.test(group) ? 1 : 0;
  containsXor = /\*/g.test(group) ? 1 : 0;

  if (
    !(containsAnd ^ containsOr ^ containsXor) &&
    containsAnd | containsOr | containsXor
  )
    return { status: -1, message: 'ERROR: Malformed query -- Mixed operators' };

  if (containsAnd) searchParams.operation = 'and';
  else if (containsOr) searchParams.operation = 'or';
  else if (containsXor) searchParams.operation = 'xor';
  else if (searchParams.components.length != 1) {
    return {
      status: -1,
      message: 'ERROR: Malformed query -- Missing operator',
    };
  } else searchParams.operation = 'or';

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
  var macrosTable = {};
  var keys = [];
  var negKeys = [];
  var response = {};

  let errorRet = null;

  // Construct initial lookup tables
  for (let i = 0; i < queryObj.length; i++) {
    let obj = queryObj[i];
    if (obj.ops.status !== undefined) {
      errorRet = obj.ops;
      break;
    }
    obj.ops.components.map((component) => {
      if (!component.isMacro && !component.isNegated)
        keys.push(component.token);
      if (component.isNegated) negKeys.push(component.token);
      else macrosTable[component.token] = null;
    });
  }

  if (errorRet != null) return errorRet;

  // Grab resume _id's from mongo with the keyset
  const fetchFromMongo = async (tokenArr, negation = false) => {
    const mongoClient = new MongoClient(process.env.MONGO_SEARCH_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    let mgdbRetObj = [];

    try {
      await mongoClient.connect();

      // Construct mongoDB query object if needed
      let mgdbQueryObj = {};
      if (!negation) {
        mgdbQueryObj = { $or: [] };
        tokenArr.map((t) => mgdbQueryObj['$or'].push({ name: t }));
      }
      mgdbRetObj = await mongoClient
        .db('resume_org')
        .collection('skill_assoc')
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
  var resp = await fetchFromMongo(keys, negKeys.length != 0);
  if (resp.length == 0) {
    response.status = -1;
    response.message = 'ERROR: No valid skills provided';
    return response;
  }

  // Convert resume IDs to strings and store in skill set
  resp.map((respObj) => {
    respTable[respObj.name] = new Set();
    respObj.resumes.map((res) => respTable[respObj.name].add(res.toString()));
  });

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
    let chunkResp = null; // Return variable, set of all valid resume IDs for chunk
    let completeResumeSet = null; // Set containing all resume documents
    chunk.ops.components.map((component) => {
      // If evaluating a negated component and we have not already done so, construct the master skill set
      if (component.isNegated && completeResumeSet == null) {
        completeResumeSet = new Set();
        Object.keys(respTable).map(
          (respKey) =>
            (completeResumeSet = completeResumeSet.union(respTable[respKey]))
        );
      }

      if (chunkResp == null) {
        chunkResp = component.isMacro
          ? component.isNegated
            ? completeResumeSet.difference(macrosTable[component.token])
            : macrosTable[component.token]
          : component.isNegated
          ? completeResumeSet.difference(respTable[component.token])
          : respTable[component.token];
      } else {
        let comparisonSet = component.isMacro
          ? component.isNegated
            ? completeResumeSet.difference(macrosTable[component.token])
            : macrosTable[component.token]
          : component.isNegated
          ? completeResumeSet.difference(respTable[component.token])
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
  require('dotenv').config();
  let response = {};
  if (process.env.MONGO_SEARCH_URI == null) {
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

  return response;
};

// let searchQuery = 'c | python';
// console.log('Searching: ' + searchQuery);
// search(searchQuery);

exports.search = search;
