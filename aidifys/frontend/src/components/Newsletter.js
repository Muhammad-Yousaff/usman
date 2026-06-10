import React, { useState } from 'react'
import { FaEnvelopeOpenText, FaRocket } from "react-icons/fa6"
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BASE_URL } from '../utils/BASE_URL'

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (response.ok && data.status) {
        toast.success(data.message || "Subscribed successfully!");
        setEmail("");
      } else {
        toast.error(data.message || "Failed to subscribe.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <h3 className='text-lg font-bold mb-2 flex items-center gap-2'>
          <FaEnvelopeOpenText />
          Email me for more Jobs!
        </h3>
        <p className='text-primary/75 text-base mb-4'>Sure, if you're looking for more relevant job opportunities or have any questions,
          feel free to email us at Aidifys.com.
          We're here to help you with your job search journey!</p>
        <form onSubmit={handleSubscribe} className="w-full flex flex-col items-center justify-center space-y-4">
          <input 
            type="email" 
            name="email" 
            id="email" 
            placeholder='name@mail.com' 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border focus:outline-none" 
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full px-5 py-2 border focus:outline-none bg-sky-500 rounded-sm text-white cursor-pointer font-semibold hover:bg-sky-600 transition-colors"
          >
            {loading ? "Subscribing..." : "Subscribe!"}
          </button>
        </form>
      </div>
      <div className='mt-20'>
        <h3 className='text-lg font-bold mb-2 flex items-center gap-2'>
          <FaRocket />
          Get noticed Faster!
        </h3>
        <p className='text-primary/75 text-base mb-4'>Sure, if you're looking for more relevant job opportunities or have any questions,
          feel free to email us at Aidifys.com.
          We're here to help you with your job search journey!</p>
        <div className="w-full flex flex-col items-center justify-center space-y-4">
          <Link to="/cv-analyzer" className="w-full">
            <button className="w-full px-5 py-2 border focus:outline-none bg-sky-500 rounded-sm text-white cursor-pointer font-semibold text-center hover:bg-sky-600 transition-colors flex items-center justify-center gap-2">
              Upload your Resume
              <span className="text-lg">↑</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Newsletter