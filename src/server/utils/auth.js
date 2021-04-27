const { MongoClient, ObjectID, Db } = require('mongodb');

const PERMISSION_LEVELS = {
  "Employee": 1,
  "Manager": 2,
  "Admin": 3,
}

const NOT_LOGGED_IN_PERMISSION_LEVEL = 0;

const MIN_CLIENT_PERMISSIONS = {
  "/login": NOT_LOGGED_IN_PERMISSION_LEVEL,
  "/profile": PERMISSION_LEVELS["Employee"],
  "/resume": PERMISSION_LEVELS["Employee"],
  "/database": PERMISSION_LEVELS["Manager"],
  "/reports": PERMISSION_LEVELS["Manager"],
  "/admin": PERMISSION_LEVELS["Admin"],
}

const MIN_SERVER_PERMISSIONS = {
  "/resume-upload": PERMISSION_LEVELS["Employee"],
  "/resume-search": PERMISSION_LEVELS["Manager"],
  "/resume-report": PERMISSION_LEVELS["Manager"],
  "/resume-download/self": PERMISSION_LEVELS["Employee"], // Special case: Not actually a URL; check on server endpoint whether req is for self
  "/resume-download/other": PERMISSION_LEVELS["Manager"], // Special case: Not actually a URL; check on server endpoint whether req is for self
  "/login": NOT_LOGGED_IN_PERMISSION_LEVEL,
  "/getClientPermissions": NOT_LOGGED_IN_PERMISSION_LEVEL,
  "/getProfile": PERMISSION_LEVELS["Employee"],
  "/updateProfile": PERMISSION_LEVELS["Employee"],
  "/getResumeSkills": PERMISSION_LEVELS["Employee"],
  "/updateResumeSkills": PERMISSION_LEVELS["Employee"],
  "/getAllSearchableSkills": PERMISSION_LEVELS["Manager"],
  "/adminGetProfiles": PERMISSION_LEVELS["Admin"],
  "/adminUpdateProfile": PERMISSION_LEVELS["Admin"],
  "/adminDeleteProfile": PERMISSION_LEVELS["Admin"],
  "/skill-display-names": PERMISSION_LEVELS["Employee"],
}

/**
 * This method returns a list of all URLs that should be exposed to the client for a given UserID.
 * Since these are just client-side GUIs, no need to make this secure.
 * @param {String} userID User string to search
 * @param {Db} db Connection to the resume-org database
 */
async function getClientPermissions(userID, db) {
  let clientPermissionLevel = NOT_LOGGED_IN_PERMISSION_LEVEL;
  if (userID) {
    const employee = await db.collection('employees').findOne({ userID: `${userID}` });
    if (employee) {
      clientPermissionLevel = employee.role && PERMISSION_LEVELS[employee.role] !== undefined ? PERMISSION_LEVELS[employee.role] : PERMISSION_LEVELS["Employee"];
    }
  }
  const permissions = {};
  Object.entries(MIN_CLIENT_PERMISSIONS).forEach(([url, permissionLevel]) => {
    permissions[url] = clientPermissionLevel >= permissionLevel;
  });
  return permissions;
}

/**
 * TODO: This is not secure. Add better authentication!
 * Returns whether a userID is allowed to access a given server endpoint
 * @param {String} userID User string to search
 * @param {Db} db Connection to the resume-org database
 * @param {String} url Server endpoint
 */
async function hasServerPermission(userID, db, url) {
  if (MIN_SERVER_PERMISSIONS[url] === undefined) {
    console.log(`${userID} has insufficient permissions to access ${url}`);
    return false;
  }
  let clientPermissionLevel = NOT_LOGGED_IN_PERMISSION_LEVEL;
  if (userID) {
    const employee = await db.collection('employees').findOne({ userID: `${userID}` });
    if (employee) {
      clientPermissionLevel = employee.role && PERMISSION_LEVELS[employee.role] !== undefined ? PERMISSION_LEVELS[employee.role] : PERMISSION_LEVELS["Employee"];
    }
  }
  const hasPermissions = clientPermissionLevel >= MIN_SERVER_PERMISSIONS[url];
  if (hasPermissions) {
    console.log(`${userID} has sufficient permissions to access ${url}`);
  } else {
    console.log(`${userID} has insufficient permissions to access ${url}`);
  }
  return hasPermissions;
}

exports.getClientPermissions = getClientPermissions;
exports.hasServerPermission = hasServerPermission;
exports.PERMISSION_LEVELS = PERMISSION_LEVELS;