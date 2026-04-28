"use client";

export default function AuthSection({ user, login, logout }) {
  return (
    <>
      {user && (
        <p className="text-green-600">
          Logged in as: {user.email}
        </p>
      )}

      {!user && (
        <button
          onClick={login}
          className="px-6 py-2 bg-blue-500 text-white rounded"
        >
          Login with Google
        </button>
      )}

      {user && (
        <button
          onClick={logout}
          className="px-6 py-2 bg-red-500 text-white rounded"
        >
          Logout
        </button>
      )}
    </>
  );
}