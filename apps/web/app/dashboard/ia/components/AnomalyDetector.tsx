import React, { useState } from 'react';

type Anomaly = {
  message: string;
  severity: 'high' | 'medium' | 'low';
  location?: string;
};

export default function AnomalyDetector() {
  const [fileContent, setFileContent] = useState<string>('');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  const analyse = async () => {
    if (!fileContent) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent }),
      });
      if (!response.ok) throw new Error('Analyse failed');
      const data = await response.json();
      setAnomalies(data.anomalies ?? []);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="anomaly-detector glass">
      <h3>Détection d’anomalies</h3>
      <input type="file" accept=".txt,.json,.pdf" onChange={handleFileChange} disabled={loading} />
      <button onClick={analyse} disabled={loading || !fileContent} className="btn-primary">
        {loading ? 'Analyse...' : 'Analyser'}
      </button>
      {error && <p className="error">{error}</p>}
      {anomalies.length > 0 && (
        <ul className="anomaly-list">
          {anomalies.map((a, i) => (
            <li key={i} className={`severity-${a.severity}`}>
              <strong>{a.severity.toUpperCase()}</strong>: {a.message}
              {a.location && <span className="location"> – {a.location}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
