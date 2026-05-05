export const ROLES = {
  TO:          'Technical Officer',
  RO:          'Research Officer',
  TEAM_LEADER: 'Team Leader',
  HOD:         'HOD',
  EXEC_DIR:    'Executive Director',
  CEO:         'CEO',
};

export const ROLE_LEVELS = {
  'Technical Officer':  1,
  'Research Officer':   2,
  'Team Leader':        3,
  'HOD':                4,
  'Executive Director': 5,
  'CEO':                6,
};

export const DIVISIONS = [
  'Agricultural Data Science and Engineering',
  'Plant Health and Agricultural Resilience',
  'Analytical Chemistry Services',
  'Genetics Biotechnology and Bioinnovation',
  'Sustainable Agricultural Practices',
];

export function getRoleLevel(role) {
  return ROLE_LEVELS[role] ?? 0;
}

export function canApproveKPI(approverRole, ownerRole) {
  return getRoleLevel(approverRole) > getRoleLevel(ownerRole);
}

export function canViewAllDivisions(role) {
  return role === ROLES.CEO || role === ROLES.EXEC_DIR;
}

export function canManageUsers(role) {
  return getRoleLevel(role) >= getRoleLevel(ROLES.HOD);
}
