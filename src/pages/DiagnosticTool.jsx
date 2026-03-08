import { useState } from 'react';
import { getDocument, getDocuments } from '../lib/firebase-db';
import { useNotify } from '../components/Toaster';

const DiagnosticTool = () => {
    const notify = useNotify();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const GHOST_ID = 'dOgZ9Aks5NjHXsMOFQ9L';

    const runDiagnostic = async () => {
        setLoading(true);
        const diagnosticResults = {};

        try {
            // Check main collections
            const mainDoc = await getDocument('circulars', GHOST_ID);
            diagnosticResults.circulars = mainDoc ? 'EXISTS' : 'NOT FOUND';
            if (mainDoc) diagnosticResults.circularsData = mainDoc;

            const deletedDoc = await getDocument('deleted_circulars', GHOST_ID);
            diagnosticResults.deleted_circulars = deletedDoc ? 'EXISTS' : 'NOT FOUND';
            if (deletedDoc) diagnosticResults.deletedData = deletedDoc;

            // Check if it appears in queries
            const allCirculars = await getDocuments('circulars', {
                orderBy: ['created_at', 'desc'],
                limit: 100
            });
            const foundInQuery = allCirculars.find(c => c.id === GHOST_ID);
            diagnosticResults.foundInQuery = foundInQuery ? 'YES' : 'NO';
            if (foundInQuery) diagnosticResults.queryData = foundInQuery;

            // Check related collections
            const views = await getDocuments('circular_views', {
                where: [['circular_id', '==', GHOST_ID]]
            });
            diagnosticResults.views = views.length;

            const bookmarks = await getDocuments('circular_bookmarks', {
                where: [['circular_id', '==', GHOST_ID]]
            });
            diagnosticResults.bookmarks = bookmarks.length;

            const comments = await getDocuments('circular_comments', {
                where: [['circular_id', '==', GHOST_ID]]
            });
            diagnosticResults.comments = comments.length;

            setResults(diagnosticResults);
            notify('Diagnostic complete', 'success');
        } catch (error) {
            notify(`Error: ${error.message}`, 'error');
            diagnosticResults.error = error.message;
            setResults(diagnosticResults);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-4">Ghost Circular Diagnostic</h1>
            <p className="mb-4">Circular ID: {GHOST_ID}</p>
            
            <button
                onClick={runDiagnostic}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
                {loading ? 'Running...' : 'Run Diagnostic'}
            </button>

            {results && (
                <div className="mt-6 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">Results:</h2>
                    <pre className="whitespace-pre-wrap text-sm overflow-auto">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default DiagnosticTool;
