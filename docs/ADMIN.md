# Admin y super_admin

El **super_admin** vive en la tabla **`users`** (no en `user_accounts`). El login de admin (`/admin/login`) usa el endpoint **`/api/admin/login`**, que solo busca en `users`. Así podés usar el mismo email que como proveedor y aun así entrar al panel admin con la contraseña del super_admin.

## Cómo cambiar la contraseña del super_admin

Hay dos formas según si recordás o no la contraseña actual.

---

### Opción 1: Sabés la contraseña actual (desde la app)

1. Entrá a **/admin/login** y iniciá sesión con el email y contraseña del super_admin.
2. En el panel, suario"** (o andá a **/ahacé clic en **"Restablecer contraseña de udmin/providers/1/reset**).
3. En el formulario:
   - **Correo electrónico del usuario:** poné el **mismo email del super_admin** (ej. `maxim.degtiarev.dev@gmail.com`).
   - **Nombre de usuario:** dejalo vacío (los admins no tienen username).
   - **Nueva contraseña:** la nueva contraseña (mínimo 8 caracteres).
4. Clic en **"Restablecer contraseña"**.

Con eso se actualiza la contraseña del super_admin y podés volver a **/admin/login** con la nueva.

---

### Opción 2: No recordás la contraseña (script en la base de datos)

Si no podés entrar a /admin/login, podés cambiar la contraseña directo en la base de datos con el script:

```bash
SUPER_ADMIN_EMAIL=maxim.degtiarev.dev@gmail.com NEW_PASSWORD="Admin54321" node scripts/change-super-admin-password.js
```

- Reemplazá `tu@email.com` por el email del super_admin (el que está en la tabla `users`).
- Reemplazá `TuNuevaContraseña123!` por la nueva contraseña (mínimo 8 caracteres).
- El script usa la config de `.env.local` (POSTGRESQL_*).

Después de ejecutarlo, podés iniciar sesión en **/admin/login** con ese email y la nueva contraseña.

---

### Crear el primer super_admin

Si todavía no tenés ningún super_admin:

```bash
node scripts/create-super-admin.js
```

Eso crea (o actualiza el role de) un usuario en la tabla **`users`** con el email y contraseña definidos en el script (por defecto `maxim.degtiarev.dev@gmail.com` / `SuperAdmin2024!`). Para cambiar esa contraseña después, usá la **Opción 1** o la **Opción 2** arriba.

### No puedo ingresar a /admin/login

- **Credenciales:** El super_admin está en la tabla `users`. El email y la contraseña tienen que ser los que configuraste con `create-super-admin.js` o los que definiste con el script `change-super-admin-password.js`.
- **Mismo email que proveedor:** Si usás el mismo email en `user_accounts` (proveedor) y en `users` (super_admin), no hay problema: `/admin/login` usa `/api/admin/login`, que **solo** mira la tabla `users`. Entrá con la contraseña del **super_admin** (la de la tabla `users`), no la del proveedor.
- **Olvidé la contraseña:** Usá la **Opción 2** (script `change-super-admin-password.js`) para setear una nueva contraseña en la base de datos.
