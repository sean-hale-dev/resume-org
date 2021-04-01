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
      searchParams.components.push(token);
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
      chunks.push({
        id: curID,
        ops: parseString(managedString.slice(startIDX, endIDX + 1)),
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

    console.log(managedString.slice(startIDX, endIDX + 1));

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

  console.log(managedString);
  while (/[\(\)]/g.test(managedString)) {
    parseChunk(0, managedString.length);
    console.log(managedString);
  }
  curID = 0;
  parseChunk(0, managedString.length);
  console.log(managedString);
  return chunks;
}

let queryString = ' ((a & b) | (c & d & e)) * (e & f)';
// let queryString =
// ' (((react & a) & gatsby) | ( python & node.js & asp.net )) * ( software developer & top secret )';
// let resp = parseString(queryString);
let resp = parseQuery(queryString);
console.log(JSON.stringify(resp, 0, 2));
