"use client"

import { useState } from "react"
import Login from "../components/auth/Login"
import Register from "../components/auth/Register"
import Homepage from "./homepage/page";

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
    <div>
      <Homepage/>
    </div>
  )
}