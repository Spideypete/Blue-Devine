export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
};

export const PERMISSIONS = {
  [ROLES.OWNER]: ['*'],
  [ROLES.ADMIN]: [
    'playerlist', 'getplayerdata', 'kick', 'ban', 'unban', 'slay',
    'announce', 'directmessage', 'save', 'serverdetails', 'queue',
    'pause', 'toggleai', 'togglemigrations', 'togglegrowthmultiplier',
    'setgrowthmultiplier', 'togglewhitelist', 'disablewhitelist',
    'addwhitelist', 'removewhitelist', 'playables', 'updateplayables',
    'wipecorpses', 'togglehumans', 'togglenetupdatedistancechecks',
    'toggleailearning', 'disableaiclasses', 'custom',
  ],
  [ROLES.MODERATOR]: [
    'playerlist', 'getplayerdata', 'kick', 'ban', 'announce',
    'directmessage', 'serverdetails', 'queue',
  ],
  [ROLES.USER]: [],
};

export function hasPermission(role, command) {
  const perms = PERMISSIONS[role] || PERMISSIONS[ROLES.USER];
  if (perms.includes('*')) return true;
  return perms.includes(command.toLowerCase());
}

export function getRoleLevel(role) {
  const levels = {
    [ROLES.OWNER]: 4,
    [ROLES.ADMIN]: 3,
    [ROLES.MODERATOR]: 2,
    [ROLES.USER]: 1,
  };
  return levels[role] || 0;
}

export function getUserRole(member) {
  if (!member) return ROLES.USER;

  if (member.permissions.has('Administrator')) return ROLES.OWNER;

  const roleIds = member.roles.cache.map((r) => r.id);

  const ownerId = process.env.OWNER_ROLE_ID;
  const adminId = process.env.ADMIN_ROLE_ID;
  const modId = process.env.MOD_ROLE_ID;

  if (ownerId && roleIds.includes(ownerId)) return ROLES.OWNER;
  if (adminId && roleIds.includes(adminId)) return ROLES.ADMIN;
  if (modId && roleIds.includes(modId)) return ROLES.MODERATOR;

  return ROLES.USER;
}
