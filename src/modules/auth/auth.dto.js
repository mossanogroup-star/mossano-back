/**
 * The user as the admin panel sees it. The password hash is select:false on the
 * model, but this is the second guard — nothing here can accidentally serialise
 * a field that was not named.
 */
function toUserDto(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    isActive: doc.isActive !== false,
    lastLoginAt: doc.lastLoginAt ?? null,
    createdAt: doc.createdAt,
  };
}

function toSessionDto({ user, token }) {
  return { token, user: toUserDto(user) };
}

export { toUserDto, toSessionDto };
