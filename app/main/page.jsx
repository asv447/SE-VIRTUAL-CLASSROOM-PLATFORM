"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { signOut, onAuthStateChanged } from "firebase/auth"
 
export default function Main() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user)setUser(user)
      else router.push("/") 
    })
    return () => unsubscribe()
  }, [router])
  const handlingLogout = async () => {
    await signOut(auth)
    router.push("/")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold">Welcome to Virtual Classroom</h1>
      {user && <p className="mt-2 text-gray-700">Logged in as: {user.email}</p>}
      <button
        onClick={handlingLogout}
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  )
}
