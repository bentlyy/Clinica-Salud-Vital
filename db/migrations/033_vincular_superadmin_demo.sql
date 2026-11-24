UPDATE users
   SET sso_sub = NULL, updated_at = NOW()
 WHERE sso_sub = 'id_0926ed21f1254658bced'
   AND role <> 'superadmin';

UPDATE users
   SET sso_sub = 'id_0926ed21f1254658bced', updated_at = NOW()
 WHERE role = 'superadmin'
   AND id = (SELECT MIN(id) FROM users WHERE role = 'superadmin')
   AND sso_sub IS DISTINCT FROM 'id_0926ed21f1254658bced';
