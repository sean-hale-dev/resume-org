function parseString(group) {
  var searchParams = {
    and: [],
    or: [],
    xor: [],
  };

  let andSelect = /^([\w|! |!][\w +-]+[\w+-])(?=\s?&)|(?<=&\s)([\w|(! )|!][\w +-]+[\w+-])|(?<=&)([\w!][\w +-]+[\w+-])/gi;
  let orSelect = /^([\w|! |!][\w +-]+[\w+-])(?=\s?\|)|(?<=\|\s)([\w|(! )|!][\w +-]+[\w+-])|(?<=\|)([\w!][\w +-]+[\w+-])/gi;
  let xorSelect = /^([\w|! |!][\w +-]+[\w+-])(?=\s?\*)|(?<=\*\s)([\w|(! )|!][\w +-]+[\w+-])|(?<=\*)([\w!][\w +-]+[\w+-])/gi;

  andSkills = group.match(andSelect);
  orSkills = group.match(orSelect);
  xorSkills = group.match(xorSelect);

  if (andSkills != null)
    andSkills.map((skill) => {
      searchParams.and.push(skill.toLowerCase());
    });

  if (orSkills != null)
    orSkills.map((skill) => {
      searchParams.or.push(skill.toLowerCase());
    });

  if (xorSkills != null)
    xorSkills.map((skill) => {
      searchParams.xor.push(skill.toLowerCase());
    });

  return searchParams;
}

function parseQuery(query) {
  var chunks = [
    {
      id: 0,
      ops: [],
    },
  ];

  var curID = 1;
  var managedString = query;

  function parseChunk(startIDX, endIDX) {
    if (!/\(\)/g.test(managedString.slice(startIDX, endIDX + 1))) {
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
  parseChunk(0, managedString.length);
  console.log(managedString);
  return chunks;
}

let queryString =
  '(React & Vue&Gatsty& Angular & Software Developer) | (Python * C++)';
// let resp = parseString(queryString);
// console.log(resp);

let resp = parseQuery(queryString);
console.log(JSON.stringify(resp));
