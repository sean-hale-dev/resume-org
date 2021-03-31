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
    if (!managedString.slice(startIDX + 1, endIDX).test(/\(\)/g)) {
      chunks.push({ id: curID, ops: parseString(chunkTxt) });
      managedString = managedString.replace(
        managedString.slice(startIDX, endIDX + 1),
        `$$${curID}$$`
      );
      curID += 1;
      return;
    }
  }
}

let queryString =
  '(React & Vue&Gatsty& Angular & Software Developer) | (Python * C++)';
// let resp = parseString(queryString);
// console.log(resp);

let resp = parseQuery(queryString);
console.log(resp);
