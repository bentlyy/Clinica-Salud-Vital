UPDATE users
   SET sso_sub = NULL, updated_at = NOW()
 WHERE sso_sub = 'id_9a74964ea9e34e1d96a3'
   AND role <> 'superadmin';

UPDATE users
   SET sso_sub = 'id_9a74964ea9e34e1d96a3', updated_at = NOW()
 WHERE role = 'superadmin'
   AND id = (SELECT MIN(id) FROM users WHERE role = 'superadmin')
   AND sso_sub IS DISTINCT FROM 'id_9a74964ea9e34e1d96a3';
