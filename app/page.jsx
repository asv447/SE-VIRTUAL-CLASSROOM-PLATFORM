"use client"

import { useState } from "react"
import Login from "../components/auth/Login"
import Register from "../components/auth/Register"

export default function Home() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  if (showLogin) {
    return <Login onBackToHome={() => setShowLogin(false)} />
  }

  if (showRegister) {
    return <Register onBackToHome={() => setShowRegister(false)} />
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="space-y-4">
        <button
          onClick={() => setShowLogin(true)}
          className="block w-48 py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Login
        </button>
        <button
          onClick={() => setShowRegister(true)}
          className="block w-48 py-3 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Register
        </button>
      </div>
    </div>
  )
}
