import { Link } from 'react-router-dom';

const features = [
  {
    title: 'AI-Powered Predictions',
    description: 'Machine learning models trained on real agricultural data for accurate crop and fertilizer recommendations.',
  },
  {
    title: 'Multi-Input Analysis',
    description: 'Analyzes soil nutrients, weather patterns, and market trends to provide holistic advice.',
  },
  {
    title: 'Real-Time Updates',
    description: 'Recommendations adapt based on current weather conditions and seasonal changes.',
  },
  {
    title: 'Explainable Results',
    description: 'Understand WHY each recommendation is made with visual SHAP-style explanations.',
  },
];

const stats = [
  { value: '89%', label: 'Users prefer field-specific advice' },
  { value: '86.6%', label: 'Find recommendations very useful' },
  { value: '30%', label: 'Potential cost reduction' },
  { value: '95%', label: 'Prediction accuracy' },
];

const testimonials = [
  {
    quote: "MICFRS helped me understand exactly what my paddy field needed. My yield increased by 20% after following their recommendations.",
    author: "Sunil Perera",
    role: "Rice Farmer, Kurunegoda",
  },
  {
    quote: "The visual explanations are excellent. I can now explain to farmers exactly why certain fertilizers are recommended for their specific conditions.",
    author: "Dr. Kamani Silva",
    role: "Agriculture Officer, Kandy",
  },
  {
    quote: "As a student researcher, the data insights from MICFRS have been invaluable for my thesis on sustainable farming practices.",
    author: "Tharaka Fernando",
    role: "Agri-tech Researcher, Peradeniya",
  },
];

const steps = [
  { step: 1, title: 'Enter Soil Data', description: 'Input your soil nutrient levels and pH' },
  { step: 2, title: 'Add Weather Info', description: 'Provide rainfall, temperature, and humidity' },
  { step: 3, title: 'Field Context', description: 'Tell us about your land and previous crops' },
  { step: 4, title: 'Get Recommendations', description: 'Receive personalized crop and fertilizer advice' },
];

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  section: {
    marginBottom: '64px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  card: {
    padding: '24px',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #d4d4d4',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#2c5f2d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  heading1: {
    fontSize: '42px',
    fontWeight: 600,
    marginBottom: '16px',
    lineHeight: 1.2,
  },
  heading2: {
    fontSize: '28px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  heading3: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 600,
    color: '#2c5f2d',
    marginBottom: '8px',
  },
};

export default function Index() {
  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.section}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Smart Farming Through Data-Driven Decisions
            </p>
            <h1 style={styles.heading1}>
              Personalized Crop & Fertilizer Recommendations
            </h1>
            <p style={{ fontSize: '18px', color: '#4a4a4a', marginBottom: '24px' }}>
              MICFRS analyzes your soil nutrients, weather conditions, and market data to provide
              field-specific advice — not generic regional guidelines.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <Link to="/input">
                <button style={styles.buttonPrimary}>
                  Get Started →
                </button>
              </Link>
              <Link to="/about">
                <button style={styles.button}>
                  Learn More
                </button>
              </Link>
            </div>
            <p style={{ fontSize: '14px', color: '#666' }}>Trusted by 5,000+ farmers across Sri Lanka</p>
          </div>

          {/* Sample Result Card */}
          <div style={styles.card}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>Recommendation Ready</p>
              <p style={{ fontSize: '13px', color: '#666' }}>Based on your field data</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>🌾 Rice (Paddy)</span>
                <span style={{ fontWeight: 600, color: '#2c5f2d' }}>95% suitable</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666' }}>Expected Yield</span>
                <span style={{ fontWeight: 500 }}>4.5 – 5.5 tons/ha</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ color: '#666' }}>Fertilizer</span>
                <span style={{ fontWeight: 500 }}>Urea + TSP + MOP</span>
              </div>
            </div>

            <div>
              <div style={{ height: '4px', backgroundColor: '#e5e5e5', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: '95%', height: '100%', backgroundColor: '#2c5f2d' }} />
              </div>
              <p style={{ fontSize: '13px', color: '#666' }}>Confidence Score: 95%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={styles.section}>
        <div style={styles.grid}>
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '24px', border: '1px solid #e5e5e5', borderRadius: '8px', backgroundColor: '#fafafa' }}>
              <p style={styles.statValue}>{stat.value}</p>
              <p style={{ fontSize: '14px', color: '#4a4a4a' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.section}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={styles.heading2}>Why Choose MICFRS?</h2>
          <p style={{ fontSize: '16px', color: '#4a4a4a', maxWidth: '600px', margin: '0 auto' }}>
            Our intelligent system combines multiple data sources to deliver
            recommendations tailored specifically to your field conditions.
          </p>
        </div>

        <div style={styles.grid}>
          {features.map((feature, i) => (
            <div key={i} style={styles.card}>
              <h3 style={styles.heading3}>{feature.title}</h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5 }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={styles.section}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={styles.heading2}>How It Works</h2>
          <p style={{ fontSize: '16px', color: '#4a4a4a' }}>Get personalized recommendations in just four simple steps.</p>
        </div>

        <div style={styles.grid}>
          {steps.map((item, i) => (
            <div key={i} style={{ textAlign: 'center', ...styles.card }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '20px', fontWeight: 600, color: '#2c5f2d' }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '13px', color: '#666' }}>{item.description}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link to="/input">
            <button style={styles.buttonPrimary}>
              Start Now →
            </button>
          </Link>
        </div>
      </section>

      {/* Value Propositions */}
      <section style={styles.section}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div>
            <h2 style={styles.heading2}>Make Smarter Farming Decisions</h2>
            <div style={{ marginTop: '24px' }}>
              {[
                'Get personalized crop recommendations based on YOUR field conditions',
                'Optimize fertilizer use and reduce costs by up to 30%',
                'Understand WHY each recommendation is made with AI explanations',
                'Real-time updates based on weather and market changes',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ color: '#2c5f2d', fontWeight: 'bold' }}>✓</span>
                  <p style={{ fontSize: '15px', color: '#4a4a4a' }}>{item}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '32px' }}>
              <Link to="/input">
                <button style={styles.buttonPrimary}>Try It Free</button>
              </Link>
            </div>
          </div>

          <div style={styles.grid}>
            {[
              { value: '30%', label: 'Cost Reduction' },
              { value: '24/7', label: 'Available Anytime' },
              { value: '20%', label: 'Yield Increase' },
              { value: '50+', label: 'Crop Varieties' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '24px', border: '1px solid #e5e5e5', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <p style={{ fontSize: '32px', fontWeight: 600, color: '#2c5f2d', marginBottom: '8px' }}>{item.value}</p>
                <p style={{ fontSize: '14px', color: '#666' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={styles.section}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={styles.heading2}>Trusted by Farmers & Experts</h2>
          <p style={{ fontSize: '16px', color: '#4a4a4a' }}>See what our users say about their experience with MICFRS.</p>
        </div>

        <div style={styles.grid}>
          {testimonials.map((testimonial, i) => (
            <div key={i} style={styles.card}>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '20px' }}>
                {[...Array(5)].map((_, j) => (
                  <span key={j} style={{ color: '#f5b042', fontSize: '16px' }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: '14px', color: '#4a4a4a', marginBottom: '24px', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{testimonial.quote}"
              </p>
              <div>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>{testimonial.author}</p>
                <p style={{ fontSize: '13px', color: '#666' }}>{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section>
        <div style={{ textAlign: 'center', padding: '48px', border: '1px solid #e5e5e5', borderRadius: '12px', backgroundColor: '#fafafa' }}>
          <h2 style={styles.heading2}>Ready to Optimize Your Farm?</h2>
          <p style={{ fontSize: '16px', color: '#4a4a4a', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Join thousands of Sri Lankan farmers using MICFRS to make
            data-driven decisions and improve their yields.
          </p>
          <Link to="/input">
            <button style={{ ...styles.buttonPrimary, padding: '12px 28px', fontSize: '16px' }}>
              Get Your Free Recommendation →
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}