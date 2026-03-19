import React from "react";
import ImageUpload from "./ImageUpload";

function App() {
  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col items-center p-6 text-white">
      <h1 className="text-center text-2xl font-bold mt-6">VisionBox</h1>
      <h3 className="text-center mt-2 text-white font-semibold">
        {" "}
        AI-Powered iventory Management System
      </h3>
      <ImageUpload />
    </div>
  );
}

export default App;
