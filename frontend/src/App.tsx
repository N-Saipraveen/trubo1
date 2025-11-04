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
    inputContent,
    setInputContent,
    outputContent,
    sourceType,
    targetType,
    warnings,
  } = useStore();

  useEffect(() => {
    // Always use light mode
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating background orbs */}
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />
      <div className="floating-orb orb-3" />

      <Header />

      <main className="container py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-8"
        >
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="text-center space-y-6"
          >
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-slide-up">
              TurboDbx
            </h1>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground">
              Convert Your Database Schemas
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform between SQL, NoSQL, and JSON formats while preserving schema integrity,
              constraints, and relationships with beautiful visualizations.
            </p>
          </motion.div>

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
                    language={targetType === 'sql' ? 'sql' : 'json'}
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

      <Toaster theme="light" richColors position="top-right" />
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card glass-card-hover p-8 rounded-2xl group"
    >
      <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default App;
