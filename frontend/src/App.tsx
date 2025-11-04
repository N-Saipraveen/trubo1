import { useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { CodeEditor } from './components/CodeEditor';
import { ConversionPanel } from './components/ConversionPanel';
import { SchemaVisualizer } from './components/SchemaVisualizer';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { useStore } from './store/useStore';
import { Toaster } from 'sonner';
import { motion } from 'framer-motion';

function App() {
  const {
    theme,
    setTheme,
    inputContent,
    setInputContent,
    outputContent,
    sourceType,
    warnings,
  } = useStore();

  useEffect(() => {
    // Set initial theme and apply immediately
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';

    // Apply dark class immediately to prevent flash
    document.documentElement.classList.add('dark');

    setTheme(initialTheme);
  }, [setTheme]);

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">
              Convert Your Database Schemas
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform between SQL, NoSQL, and JSON formats while preserving schema integrity,
              constraints, and relationships.
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-[400px_1fr] gap-6">
            {/* Left Sidebar - Controls */}
            <div className="space-y-6">
              <FileUpload />
              <ConversionPanel />
              <AnalysisPanel />
            </div>

            {/* Right Content - Editors and Visualization */}
            <div className="space-y-6">
              <Tabs defaultValue="input" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="output" disabled={!outputContent}>
                    Output
                  </TabsTrigger>
                  <TabsTrigger value="visualize" disabled={!outputContent}>
                    Visualize
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="input" className="space-y-4">
                  <CodeEditor
                    title="Input Schema"
                    value={inputContent}
                    onChange={setInputContent}
                    language={sourceType === 'sql' ? 'sql' : 'json'}
                    showActions={false}
                  />

                  {warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                      <h4 className="font-medium text-amber-500 mb-2">Warnings</h4>
                      <ul className="space-y-1 text-sm text-amber-500/80">
                        {warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="output">
                  <CodeEditor
                    title="Output Schema"
                    value={outputContent}
                    readOnly
                    language={sourceType === 'sql' ? 'json' : 'sql'}
                    showActions={true}
                  />
                </TabsContent>

                <TabsContent value="visualize">
                  <SchemaVisualizer />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <FeatureCard
              title="Schema Integrity"
              description="Preserve all constraints, relationships, and data types during conversion"
              icon="🔒"
            />
            <FeatureCard
              title="Multi-Format"
              description="Support for SQL (MySQL, PostgreSQL, SQLite), NoSQL (MongoDB), and JSON"
              icon="🔄"
            />
            <FeatureCard
              title="Visual Analysis"
              description="Interactive schema visualization with ER diagrams and tree views"
              icon="📊"
            />
          </div>
        </motion.div>
      </main>

      <Toaster theme={theme} richColors position="top-right" />
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}

export default App;
