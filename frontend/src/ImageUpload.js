import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ImageUpload = () => {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  const { getRootProps, getInputProps } = useDropzone({
    accept: "image/*",
    multiple: true,
    onDrop: (acceptedFiles) => {
      setImages(acceptedFiles);
      setPreviews(acceptedFiles.map((file) => URL.createObjectURL(file)));
    },
  });

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await axios.get("http://localhost:8000/models");
        setModels(res.data.models);
        setSelectedModel(res.data.current_model);
      } catch (error) {
        console.error(
          "Error fetching models:",
          error.response || error.message
        );
      }
    };
    fetchModels();
  }, []);

  const handleUpload = async () => {
    if (images.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    setLoading(true);
    const results = [];

    for (const image of images) {
      const formData = new FormData();
      formData.append("file", image);

      try {
        const res = await axios.post(
          "http://localhost:8000/predict",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        results.push({ ...res.data, timestamp: new Date().toLocaleString() });
      } catch (error) {
        console.error("Error uploading file:", error.response || error.message);
        alert("Failed to upload and process an image.");
      }
    }

    setResponses(results);
    setLoading(false);
  };

  const aggregateByBoxType = () => {
    const boxTypeCounts = {};

    responses.forEach((response) => {
      response.detections.forEach((detection) => {
        const type = detection.class;
        if (!boxTypeCounts[type]) {
          boxTypeCounts[type] = { count: 0, timestamps: [] };
        }
        boxTypeCounts[type].count += 1;
        boxTypeCounts[type].timestamps.push(response.timestamp);
      });
    });

    return Object.entries(boxTypeCounts).map(([type, data], index) => ({
      id: index + 1,
      type,
      count: data.count,
      timestamps: data.timestamps.join(", "),
    }));
  };

  const generatePDF = () => {
    if (responses.length === 0) {
      alert("No data available to generate a report.");
      return;
    }

    const aggregatedData = aggregateByBoxType();
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    doc.setFontSize(16);
    doc.text("VisionBox Detection Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated At: ${timestamp}`, 20, 30);

    let y = 40;
    doc.text("Detection Summary:", 20, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Sr. No.", "Type of Box", "Count", "Timestamps"]],
      body: aggregatedData.map((data) => [
        data.id,
        data.type,
        data.count,
        data.timestamps,
      ]),
    });

    const totalBoxes = aggregatedData.reduce(
      (sum, data) => sum + data.count,
      0
    );
    y = doc.lastAutoTable.finalY + 10;
    doc.text(`Overall Total Count: ${totalBoxes}`, 20, y);

    doc.save("VisionBox_Detection_Report.pdf");
  };

  const handleModelChange = async () => {
    try {
      await axios.post(
        `http://localhost:8000/set-model?model_name=${selectedModel}`
      );
      alert(`Model switched to ${selectedModel}`);
    } catch (error) {
      console.error("Error setting model:", error.response || error.message);
      alert("Failed to switch the model.");
    }
  };

  const generateJsonData = () => {
    return aggregateByBoxType().map((data) => ({
      type: data.type,
      count: data.count,
      timestamps: data.timestamps,
    }));
  };

  return (
    <div className="min-h-screen w-full bg-zinc-900 flex flex-col items-center p-6 text-white">
      <div className="max-w-4xl w-full bg-zinc-900 shadow-md rounded-lg p-6">
        {/* Model Selection */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <label htmlFor="model-select" className="text-white/50 mr-2">
              Select Model:
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className=" p-2 rounded w-48 bg-zinc-700 text-white"
            >
              <option value={"model1"}>model1- For boxes and cartons</option>
              <option value={"model2"}>model2- For bottle stacks</option>
            </select>
          </div>
          <button
            onClick={handleModelChange}
            className="btn bg-blue-700 rounded-xl px-6 py-2"
          >
            Set Model
          </button>
        </div>

        {/* File Dropzone */}
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-blue-700 rounded-lg p-12 text-center cursor-pointer hover:bg-zinc-800 transition"
        >
          <input {...getInputProps()} />
          <p className="text-white/50">
            Drag & drop your images here, or click to select files
          </p>
        </div>

        {/* Image Previews */}
        <div className="flex flex-wrap mt-6 gap-4 justify-center">
          {previews.map((preview, index) => (
            <img
              key={index}
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-32 h-32 rounded-lg shadow-md border border-gray-300"
            />
          ))}
        </div>

        {/* Upload Button */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleUpload}
            className="btn bg-blue-700 rounded-xl px-6 py-2"
            disabled={loading}
          >
            {loading ? "Processing..." : "Upload and Process"}
          </button>
        </div>

        {/* Results Table */}
        {responses.length > 0 && (
          <div className="mt-8">
            {/* Similar table and buttons as the earlier implementation */}

            <h2 className="text-xl font-bold text-gray-600 mb-4 text-center">
              Prediction Results by Box Type
            </h2>
            <table className="table table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Sr. No.
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Type of Box
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {aggregateByBoxType().map((data) => (
                  <tr key={data.id}>
                    <td className="border border-gray-300 px-4 py-2">
                      {data.id}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {data.type}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {data.count}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-bold">
                    Total
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-bold"></td>
                  <td className="border border-gray-300 px-4 py-2 font-bold">
                    {aggregateByBoxType().reduce(
                      (sum, data) => sum + data.count,
                      0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-center mt-6 gap-4">
              <button
                onClick={generatePDF}
                className="btn bg-green-700 rounded-xl font-semibold px-6 py-2"
              >
                Download PDF Report
              </button>
              <button
                onClick={() => setIsJsonModalOpen(true)}
                className="btn bg-blue-600 rounded-xl font-semibold px-6 py-2"
              >
                View in JSON
              </button>
            </div>

            {/* JSON Modal */}
            <input
              type="checkbox"
              id="json-modal"
              className="modal-toggle"
              checked={isJsonModalOpen}
              onChange={() => setIsJsonModalOpen(!isJsonModalOpen)}
            />
            {isJsonModalOpen && (
              <div className="modal">
                <div className="modal-box">
                  <h3 className="font-bold text-lg">
                    Detection Results in JSON
                  </h3>
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
                    <code>{JSON.stringify(generateJsonData(), null, 2)}</code>
                  </pre>
                  <div className="modal-action">
                    <label htmlFor="json-modal" className="btn">
                      Close
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
