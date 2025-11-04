import { useCallback, useState } from 'react';
import { ArrowRight, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function ConversionPanel() {
  const {
    inputContent,
    sourceType,
    setSourceType,
    targetType,
    setTargetType,
    sqlDialect,
    setSqlDialect,
    sourceSqlDialect,
    setSourceSqlDialect,
    targetSqlDialect,
    setTargetSqlDialect,
    options,
    setOptions,
    setOutputContent,
    setWarnings,
    setAnalysis,
    setGraphData,
    isLoading,
    setIsLoading,
  } = useStore();

  const [showOptions, setShowOptions] = useState(false);

  const handleConvert = useCallback(async () => {
    if (!inputContent || !sourceType || !targetType) {
      toast.error('Please provide input and select source/target types');
      return;
    }

    setIsLoading(true);

    try {
      // Convert - use appropriate dialect based on conversion type
      const dialect = sourceType === 'sql' && targetType === 'sql'
        ? targetSqlDialect
        : targetType === 'sql'
        ? sqlDialect
        : undefined;

      const convertResponse = await api.convert({
        input: inputContent,
        sourceType,
        targetType,
        dialect,
        options: {
          ...options,
          // Add source dialect for SQL to SQL conversions
          sourceDialect: sourceType === 'sql' && targetType === 'sql' ? sourceSqlDialect : undefined,
        } as any,
      });

      if (convertResponse.success && convertResponse.result) {
        const schema = convertResponse.result.schema;
        const output = typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2);

        setOutputContent(output);
        setWarnings(convertResponse.warnings || []);

        if (convertResponse.warnings && convertResponse.warnings.length > 0) {
          toast.warning(`Conversion completed with ${convertResponse.warnings.length} warning(s)`);
        } else {
          toast.success('Conversion completed successfully');
        }

        // Analyze the result
        const analyzeResponse = await api.analyze(inputContent);
        if (analyzeResponse.success && analyzeResponse.analysis) {
          setAnalysis(analyzeResponse.analysis);
        }

        // Visualize
        const visualizeResponse = await api.visualize(inputContent, sourceType);
        if (visualizeResponse.success && visualizeResponse.graph) {
          setGraphData(visualizeResponse.graph);
        }
      } else {
        toast.error(convertResponse.errors?.join(', ') || 'Conversion failed');
      }
    } catch (error) {
      toast.error('Failed to convert schema');
      console.error('Conversion error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputContent,
    sourceType,
    targetType,
    sqlDialect,
    sourceSqlDialect,
    targetSqlDialect,
    options,
    setOutputContent,
    setWarnings,
    setAnalysis,
    setGraphData,
    setIsLoading,
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Conversion Settings</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOptions(!showOptions)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showOptions ? 'Hide' : 'Show'} Options
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source and Target Selection */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Type</label>
            <Select
              value={sourceType || undefined}
              onValueChange={(value) => setSourceType(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="nosql">NoSQL</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Type</label>
            <Select
              value={targetType || undefined}
              onValueChange={(value) => setTargetType(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="nosql">NoSQL</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* SQL Dialect Selection - Show two selectors when both are SQL */}
        {sourceType === 'sql' && targetType === 'sql' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source SQL Dialect</label>
              <Select value={sourceSqlDialect} onValueChange={(value) => setSourceSqlDialect(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="mssql">MS SQL Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target SQL Dialect</label>
              <Select value={targetSqlDialect} onValueChange={(value) => setTargetSqlDialect(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="mssql">MS SQL Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (sourceType === 'sql' || targetType === 'sql') ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">SQL Dialect</label>
            <Select value={sqlDialect} onValueChange={(value) => setSqlDialect(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="sqlite">SQLite</SelectItem>
                <SelectItem value="mssql">MS SQL Server</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {/* Advanced Options */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Preserve Case</label>
                  <p className="text-xs text-muted-foreground">Keep original field name casing</p>
                </div>
                <Switch
                  checked={options.preserveCase}
                  onCheckedChange={(checked) => setOptions({ preserveCase: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Generate IDs</label>
                  <p className="text-xs text-muted-foreground">Auto-generate primary key IDs</p>
                </div>
                <Switch
                  checked={options.generateIds}
                  onCheckedChange={(checked) => setOptions({ generateIds: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Include Timestamps</label>
                  <p className="text-xs text-muted-foreground">Add created_at/updated_at fields</p>
                </div>
                <Switch
                  checked={options.includeTimestamps}
                  onCheckedChange={(checked) => setOptions({ includeTimestamps: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Embed Relations</label>
                  <p className="text-xs text-muted-foreground">Embed related data (SQL→NoSQL)</p>
                </div>
                <Switch
                  checked={options.embedRelations}
                  onCheckedChange={(checked) => setOptions({ embedRelations: checked })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Normalization Depth</label>
                <Select
                  value={options.normalizeDepth.toString()}
                  onValueChange={(value) => setOptions({ normalizeDepth: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">Level 1</SelectItem>
                    <SelectItem value="2">Level 2</SelectItem>
                    <SelectItem value="3">Level 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Convert Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleConvert}
          disabled={!inputContent || !sourceType || !targetType || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-5 w-5" />
              Convert Schema
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
