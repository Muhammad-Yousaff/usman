import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../utils/BASE_URL';
import { 
  FiUploadCloud, FiMail, FiPhone, FiUser, FiCheckCircle, 
  FiAlertTriangle, FiBriefcase, FiCpu, FiAward, FiFileText, FiList
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const CvAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("strengths");

  const phases = [
    "Uploading CV file...",
    "Extracting text from CV...",
    "AI is analyzing your experience...",
    "Evaluating skills and strengths...",
    "Formulating recommendations...",
    "Finalizing CV report..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      let currentPhase = 0;
      setLoadingPhase(phases[0]);
      interval = setInterval(() => {
        currentPhase = (currentPhase + 1) % phases.length;
        setLoadingPhase(phases[currentPhase]);
      }, 3000);
    } else {
      setLoadingPhase("");
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'pdf' && ext !== 'txt' && ext !== 'docx') {
        toast.error("Please upload only PDF, TXT, or DOCX files.");
        return;
      }
      setFile(selectedFile);
      setErrorMsg("");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append('cv', file);

    try {
      const response = await fetch(`${BASE_URL}/analyze-cv`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.status) {
        setResult(data.analysis);
        toast.success("CV analyzed successfully!");
      } else {
        const msg = data.message || "Something went wrong during CV analysis.";
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error(error);
      const msg = "Failed to connect to backend server. Please make sure the server is running.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 border-green-600 bg-green-50";
    if (score >= 60) return "text-orange-500 border-orange-500 bg-orange-50";
    return "text-red-500 border-red-500 bg-red-50";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-28 min-h-[85vh] max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl flex items-center justify-center gap-2">
          <FiCpu className="text-sky-500" /> AI CV Analyzer
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your resume in PDF or TXT format and receive detailed feedback, strengths, gap analysis, and tailored career suggestions.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <form onSubmit={handleUpload}>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-sky-500 transition-colors cursor-pointer relative bg-gray-50">
            <input 
              type="file" 
              accept=".pdf,.txt,.docx"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <FiUploadCloud className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              Drag & Drop your CV here or <span className="text-sky-500 hover:text-sky-600">Browse file</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Supports PDF, TXT, DOCX (Max size: 5MB)</p>
          </div>

          {file && (
            <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiFileText className="text-sky-600 w-5 h-5" />
                <span className="text-sm font-medium text-gray-800 truncate max-w-xs sm:max-w-md">
                  {file.name}
                </span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setFile(null)} 
                className="text-xs text-red-500 hover:text-red-700 font-semibold"
                disabled={loading}
              >
                Clear
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={!file || loading}
              className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all ${
                !file || loading 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-sky-500 hover:bg-sky-600 active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" viewBox="0 0 24 24" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loadingPhase}
                </span>
              ) : "Analyze CV with AI"}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message Section */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-red-800">
          <div className="flex gap-3 items-start">
            <FiAlertTriangle className="text-red-600 w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg">Analysis Failed</h3>
              <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
              
              {errorMsg.toLowerCase().includes("openai api key") && (
                <div className="mt-4 p-4 bg-white border border-red-100 rounded-lg text-sm text-gray-700 space-y-2">
                  <p className="font-semibold text-gray-900">How to fix this:</p>
                  <p>1. Open the project backend directory.</p>
                  <p>2. Locate the <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono">backend/.env</code> file.</p>
                  <p>3. Set your valid OpenAI API key:</p>
                  <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs font-mono select-all">OPENAI_API_KEY="your-real-openai-api-key-here"</pre>
                  <p>4. Save the file and try again!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Dashboard */}
      {result && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fadeIn">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <FiUser className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{result.candidateInfo?.name || "Unknown Candidate"}</h2>
                <p className="text-sky-100 text-sm mt-0.5 flex flex-wrap gap-x-4">
                  {result.candidateInfo?.email && <span className="flex items-center gap-1"><FiMail /> {result.candidateInfo.email}</span>}
                  {result.candidateInfo?.phone && <span className="flex items-center gap-1"><FiPhone /> {result.candidateInfo.phone}</span>}
                </p>
              </div>
            </div>
            {/* Score Ring */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-sky-100 uppercase font-bold tracking-wider">Overall Match</p>
                <p className="text-sm font-semibold">{getScoreLabel(result.score)}</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-white flex flex-col items-center justify-center font-extrabold text-xl bg-white/10">
                {result.score}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
                <FiAward className="text-sky-500" /> Candidate Profile Summary
              </h3>
              <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                {result.summary}
              </p>
            </div>

            {/* Skills Tags */}
            {result.candidateInfo?.skills && result.candidateInfo.skills.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <FiList className="text-sky-500" /> Extracted Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.candidateInfo.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full font-medium text-xs border border-sky-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6">
                <button
                  onClick={() => setActiveTab("strengths")}
                  className={`pb-4 px-1 font-bold text-sm border-b-2 transition-all ${
                    activeTab === "strengths"
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Key Strengths
                </button>
                <button
                  onClick={() => setActiveTab("improvements")}
                  className={`pb-4 px-1 font-bold text-sm border-b-2 transition-all ${
                    activeTab === "improvements"
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Areas for Improvement
                </button>
                <button
                  onClick={() => setActiveTab("jobFit")}
                  className={`pb-4 px-1 font-bold text-sm border-b-2 transition-all ${
                    activeTab === "jobFit"
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Job Fit & Recommendations
                </button>
              </nav>
            </div>

            <div className="py-6">
              {/* Strengths Tab */}
              {activeTab === "strengths" && (
                <div className="space-y-3">
                  {result.strengths?.map((strength, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <FiCheckCircle className="text-green-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 text-sm leading-relaxed">{strength}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements Tab */}
              {activeTab === "improvements" && (
                <div className="space-y-3">
                  {result.improvements?.map((improvement, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <FiAlertTriangle className="text-orange-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 text-sm leading-relaxed">{improvement}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Job Fit Tab */}
              {activeTab === "jobFit" && (
                <div className="space-y-3">
                  {result.jobFit?.map((job, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <FiBriefcase className="text-sky-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 text-sm leading-relaxed">{job}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
};

export default CvAnalyzer;
