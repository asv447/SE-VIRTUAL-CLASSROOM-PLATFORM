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

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 animate-gradient">
//       <div className="bg-white/80 backdrop-blur-lg p-10 rounded-2xl shadow-2xl text-center max-w-md w-full border border-white/50">
//         <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">
//           Virtual Classroom
//         </h1>

//         <div className="mt-8 flex flex-col gap-4">
//           <button
//             onClick={() => setShowLogin(true)}
//             className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200"
//           >
//             Login
//           </button>
//           <button
//             onClick={() => setShowRegister(true)}
//             className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
//           >
//             Register
//           </button>
//         </div>
//       </div>

//       {/* Background gradient animation */}
//       <style jsx>{`
//         .animate-gradient {
//           background-size: 200% 200%;
//           animation: gradientShift 8s ease infinite;
//         }
//         @keyframes gradientShift {
//           0% {
//             background-position: 0% 50%;
//           }
//           50% {
//             background-position: 100% 50%;
//           }
//           100% {
//             background-position: 0% 50%;
//           }
//         }
//       `}</style>
//     </div>
//   )
// }

return (
  <div>
  <Homepage/>
  </div>
)}