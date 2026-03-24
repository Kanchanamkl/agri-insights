import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import type { CSSProperties } from 'react';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  card: {
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: '#ffffff',
    marginBottom: '24px',
  },
  cardHeader: {
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#666',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #d4d4d4',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    padding: '8px 20px',
    backgroundColor: '#2c5f2d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  badge: {
    padding: '4px 8px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #e5e5e5',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  badgeSecondary: {
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  warning: {
    padding: '12px',
    border: '1px solid #fed7aa',
    borderRadius: '6px',
    backgroundColor: '#fffbeb',
    marginBottom: '12px',
  },
  warningTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '4px',
  },
  warningMessage: {
    fontSize: '12px',
    color: '#b45309',
  },
  accordionItem: {
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  accordionTrigger: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  accordionContent: {
    padding: '16px',
    borderTop: '1px solid #e5e5e5',
    backgroundColor: '#fafafa',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e5e5',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2c5f2d',
    borderRadius: '4px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  statBox: {
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    border: '1px solid #e5e5e5',
  },
};

function FeatureImportanceBar({
  feature,
  impact,
  explanation,
}: {
  feature: string;
  impact: number;
  explanation: string;
}) {
  const isPositive = impact > 0;
  const width = Math.min(Math.abs(impact) * 100, 100);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{feature}</span>
        <span style={{ fontSize: '14px', color: isPositive ? '#2c5f2d' : '#d97706' }}>
          {isPositive ? '+' : ''}{impact.toFixed(2)}
        </span>
      </div>
      <div style={styles.progressBar}>
        <div
          style={{
            width: `${width}%`,
            height: '100%',
            backgroundColor: isPositive ? '#2c5f2d' : '#d97706',
            borderRadius: '4px',
          }}
        />
      </div>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{explanation}</p>
    </div>
  );
}

export default function Recommendations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [openSections, setOpenSections] = useState<string[]>([]);

  const recommendation = state.recommendations.find((r) => r.id === id);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const formatCurrency = (value: unknown) => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : 'N/A';
  };

  if (!recommendation) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>Recommendation Not Found</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          This recommendation may have expired or doesn't exist.
        </p>
        <Link to="/input">
          <button style={styles.buttonPrimary}>Get New Recommendation</button>
        </Link>
      </div>
    );
  }

  const { crop, fertilizer, featureImportance, alternativeCrops, riskFactors } = recommendation;
  const warnings =
    'warnings' in recommendation && Array.isArray((recommendation as { warnings?: unknown }).warnings)
      ? ((recommendation as { warnings: { type?: string; message: string }[] }).warnings)
      : undefined;

  const showCropExtras = !!crop.expectedYieldMin || !!crop.marketPriceTrend;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `MICFRS Recommendation: ${crop.label || crop.crop}`,
        text: 'Check out my personalized crop recommendation from MICFRS!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const reportData = {
      generatedAt: recommendation.timestamp?.toLocaleString() || new Date().toLocaleString(),
      cropRecommendation: crop,
      fertilizerPlan: fertilizer,
      featureImportance,
      alternativeCrops,
      riskFactors,
    };
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MICFRS_Recommendation_${crop.crop || crop.label}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button 
            onClick={() => navigate(-1)} 
            style={{ ...styles.button, marginBottom: '8px' }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Your Recommendation</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Based on your field conditions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleShare} style={styles.button}>
            Share
          </button>
          <button onClick={handleDownload} style={styles.button}>
            Export
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {warnings.map((warning, i) => (
            <div key={i} style={styles.warning}>
              <div style={styles.warningTitle}>
                ⚠ {warning.type?.replace(/_/g, ' ').toLowerCase() || 'Warning'}
              </div>
              <div style={styles.warningMessage}>{warning.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Cards */}
      <div style={styles.grid2}>
        {/* Crop Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>{crop.icon || '🌱'}</span>
              <div>
                <div style={styles.cardTitle}>{crop.crop || crop.label}</div>
                <div style={styles.cardDescription}>Recommended Crop</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Suitability Score</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#2c5f2d' }}>
                  {Math.round(crop.confidence)}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${crop.confidence}%` }} />
              </div>
            </div>

            {showCropExtras ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Expected Yield</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {crop.expectedYieldMin} – {crop.expectedYieldMax}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{crop.yieldUnit}</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Market Trend</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>
                    {crop.marketPriceTrend}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...styles.statBox, fontSize: '12px', color: '#666' }}>
                ℹ️ Agronomic yield and season data are not available for this specific variety.
              </div>
            )}
          </div>
        </div>

        {/* Fertilizer Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>🧪</span>
              <div>
                <div style={styles.cardTitle}>Fertilizer Plan</div>
                <div style={styles.cardDescription}>Targeted Soil Nutrition</div>
              </div>
            </div>
            <div style={{ ...styles.badgeSecondary, display: 'inline-block', marginTop: '8px' }}>
              {fertilizer.environmentalImpact || 'Standard'} Impact
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Fertilizer Match Score</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#2c5f2d' }}>
                  {Math.round(fertilizer.confidence)}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${fertilizer.confidence}%` }} />
              </div>
            </div>

            <div style={styles.statBox}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Recommended Fertilizer</div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>{fertilizer.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {fertilizer.components?.map((component: string, i: number) => (
                  <span key={i} style={styles.badge}>{component}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div style={styles.statBox}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Total Quantity</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{fertilizer.quantityPerAcre ?? 'N/A'}</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Est. Cost</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  {formatCurrency(fertilizer.estimatedCost)} {fertilizer.costUnit ?? ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Why This Recommendation?</div>
          <div style={styles.cardDescription}>Environmental and soil factors influencing this result</div>
        </div>
        {featureImportance?.map((item, i) => (
          <FeatureImportanceBar
            key={i}
            feature={item.feature}
            impact={item.impact}
            explanation={item.explanation}
          />
        ))}
      </div>

      {/* Expandable Sections */}
      {alternativeCrops && alternativeCrops.length > 0 && (
        <div style={styles.accordionItem}>
          <button onClick={() => toggleSection('alternatives')} style={styles.accordionTrigger}>
            🌿 Alternative Crops
            <span style={{ marginLeft: 'auto' }}>{openSections.includes('alternatives') ? '▼' : '▶'}</span>
          </button>
          {openSections.includes('alternatives') && (
            <div style={styles.accordionContent}>
              {alternativeCrops.map((alt, i) => (
                <div key={i} style={{ ...styles.statBox, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{alt.crop}</span>
                    <span style={styles.badgeSecondary}>{alt.confidence}% Match</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666' }}>{alt.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {riskFactors && riskFactors.length > 0 && (
        <div style={styles.accordionItem}>
          <button onClick={() => toggleSection('risks')} style={styles.accordionTrigger}>
            ⚠️ Risk Factors & Mitigation
            <span style={{ marginLeft: 'auto' }}>{openSections.includes('risks') ? '▼' : '▶'}</span>
          </button>
          {openSections.includes('risks') && (
            <div style={styles.accordionContent}>
              {riskFactors.map((risk, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>{risk.factor}</div>
                  <p style={{ fontSize: '12px', color: '#2c5f2d' }}>Action: {risk.mitigation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {fertilizer.applicationSchedule && fertilizer.applicationSchedule.length > 0 && (
        <div style={styles.accordionItem}>
          <button onClick={() => toggleSection('schedule')} style={styles.accordionTrigger}>
            📅 Fertilization Schedule
            <span style={{ marginLeft: 'auto' }}>{openSections.includes('schedule') ? '▼' : '▶'}</span>
          </button>
          {openSections.includes('schedule') && (
            <div style={styles.accordionContent}>
              {fertilizer.applicationSchedule.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', fontWeight: 500, fontSize: '13px' }}>Week {item.week}</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>{item.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px' }}>
        <Link to="/input">
          <button style={styles.button}>New Prediction</button>
        </Link>
        <Link to="/dashboard">
          <button style={styles.buttonPrimary}>Go to Dashboard</button>
        </Link>
      </div>
    </div>
  );
}