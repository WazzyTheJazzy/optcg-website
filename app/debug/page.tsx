'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [cardsStatus, setCardsStatus] = useState<any>(null);
  const [gameCardsStatus, setGameCardsStatus] = useState<any>(null);

  useEffect(() => {
    testDatabase();
    testCardsAPI();
    testGameCardsAPI();
  }, []);

  async function testDatabase() {
    try {
      const res = await fetch('/api/test-db');
      const data = await res.json();
      setDbStatus(data);
    } catch (error) {
      setDbStatus({ status: 'error', error: String(error) });
    }
  }

  async function testCardsAPI() {
    try {
      const res = await fetch('/api/cards?limit=5');
      const data = await res.json();
      setCardsStatus({
        status: 'ok',
        count: data.cards?.length || 0,
        sample: data.cards?.[0],
      });
    } catch (error) {
      setCardsStatus({ status: 'error', error: String(error) });
    }
  }

  async function testGameCardsAPI() {
    try {
      const res = await fetch('/api/game/cards?limit=5');
      const data = await res.json();
      setGameCardsStatus({
        status: 'ok',
        count: data.cards?.length || 0,
        sample: data.cards?.[0],
      });
    } catch (error) {
      setGameCardsStatus({ status: 'error', error: String(error) });
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">System Diagnostics</h1>

      <div className="space-y-6">
        {/* Database Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Database Connection</h2>
          {dbStatus ? (
            <div>
              <div className={`text-lg font-bold mb-2 ${dbStatus.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                Status: {dbStatus.status}
              </div>
              {dbStatus.cardCount !== undefined && (
                <div>Total Cards: {dbStatus.cardCount}</div>
              )}
              {dbStatus.sampleCard && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sample Card:</div>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 text-xs overflow-auto">
                    {JSON.stringify(dbStatus.sampleCard, null, 2)}
                  </pre>
                </div>
              )}
              {dbStatus.error && (
                <div className="text-red-600 mt-2">{dbStatus.error}</div>
              )}
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </div>

        {/* Cards API Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">/api/cards Endpoint</h2>
          {cardsStatus ? (
            <div>
              <div className={`text-lg font-bold mb-2 ${cardsStatus.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                Status: {cardsStatus.status}
              </div>
              {cardsStatus.count !== undefined && (
                <div>Cards Returned: {cardsStatus.count}</div>
              )}
              {cardsStatus.sample && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sample Card:</div>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 text-xs overflow-auto">
                    {JSON.stringify(cardsStatus.sample, null, 2)}
                  </pre>
                </div>
              )}
              {cardsStatus.error && (
                <div className="text-red-600 mt-2">{cardsStatus.error}</div>
              )}
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </div>

        {/* Game Cards API Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">/api/game/cards Endpoint</h2>
          {gameCardsStatus ? (
            <div>
              <div className={`text-lg font-bold mb-2 ${gameCardsStatus.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                Status: {gameCardsStatus.status}
              </div>
              {gameCardsStatus.count !== undefined && (
                <div>Cards Returned: {gameCardsStatus.count}</div>
              )}
              {gameCardsStatus.sample && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sample Card:</div>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 text-xs overflow-auto">
                    {JSON.stringify(gameCardsStatus.sample, null, 2)}
                  </pre>
                </div>
              )}
              {gameCardsStatus.error && (
                <div className="text-red-600 mt-2">{gameCardsStatus.error}</div>
              )}
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => {
                testDatabase();
                testCardsAPI();
                testGameCardsAPI();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh All Tests
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              <p>If the database shows 0 cards, you need to run:</p>
              <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                npm run db:seed
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
