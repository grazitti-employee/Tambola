import React, { useState } from "react";

export default function Signup({ onSignup, switchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    console.log("Signup attempt with:", username, email, password);
    onSignup(username); // no backend yet
  }

  return (
    <div className="bg-white p-6 rounded shadow w-80">
          <div>helloooooooooooooo</div>
      <h2 className="text-xl font-bold mb-4">Signup</h2>
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
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        <button type="submit" className="bg-green-500 text-white p-2 rounded">
          Signup
        </button>
      </form>
      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <button onClick={switchToLogin} className="text-blue-600 underline">
          Login
        </button>
      </p>
    </div>
  );
}