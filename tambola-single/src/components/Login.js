import React, { useState } from "react";

export default function Login({ onLogin, switchToSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    console.log("Login attempt with:", username, password);
    onLogin(username); // no real backend yet
  }

  return (
    <div className="bg-white p-6 rounded shadow w-80">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        <input
          type="text"
          placeholder="Username"
          className="border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Login
        </button>
      </form>
      <p className="mt-3 text-sm">
        Don’t have an account?{" "}
        <button onClick={switchToSignup} className="text-blue-600 underline">
          Sign up
        </button>
      </p>
    </div>
  );
}
