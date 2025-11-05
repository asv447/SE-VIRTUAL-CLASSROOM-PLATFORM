// utils/generateCourseCode.js
export function generateCourseCode(userName, subject) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const initials =
    (userName.slice(0, 2) + subject.slice(0, 2)).toUpperCase(); // e.g., 'JOCO'
  return initials + randomPart; // e.g., 'JOCOA1B2C3'
}
