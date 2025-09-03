'use client'

import { useState } from 'react'
import { PlusIcon, TrashIcon, BeakerIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { commonRulePatterns, validateRule, testEligibilityRule } from '@/lib/eligibility/jsonLogic'

interface JsonLogicEditorProps {
  value: unknown
  onChange: (value: unknown) => void
  className?: string
}

interface TestCase {
  id: string
  name: string
  input: Record<string, unknown>
  expectedOutput: boolean
}

export function JsonLogicEditor({ value, onChange, className }: JsonLogicEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'test'>('visual')
  const [jsonValue, setJsonValue] = useState(JSON.stringify(value || {}, null, 2))
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [testResults, setTestResults] = useState<any>(null)

  const handleJsonChange = (newJson: string) => {
    setJsonValue(newJson)
    try {
      const parsed = JSON.parse(newJson)
      onChange(parsed)
    } catch (e) {
      // Invalid JSON, don't update the value
    }
  }

  const handlePatternSelect = (patternName: string) => {
    let pattern: unknown
    
    switch (patternName) {
      case 'ageRange':
        pattern = commonRulePatterns.ageRange(18, 65)
        break
      case 'incomeBelow':
        pattern = commonRulePatterns.incomeBelow(500000)
        break
      case 'hasCategory':
        pattern = commonRulePatterns.hasCategory(['sc', 'st', 'obc'])
        break
      case 'residentOf':
        pattern = commonRulePatterns.residentOf(['damday-chuanala', 'gangolihat'])
        break
      default:
        return
    }

    const newJson = JSON.stringify(pattern, null, 2)
    setJsonValue(newJson)
    onChange(pattern)
  }

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      name: `Test Case ${testCases.length + 1}`,
      input: { age: 25, annualIncome: 300000, category: 'general' },
      expectedOutput: true
    }
    setTestCases([...testCases, newTestCase])
  }

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    setTestCases(testCases.map(tc => 
      tc.id === id ? { ...tc, ...updates } : tc
    ))
  }

  const deleteTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id))
  }

  const runTests = () => {
    if (!value || testCases.length === 0) return

    const testData = testCases.map(tc => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput
    }))

    try {
      const results = testEligibilityRule(value, testData)
      setTestResults(results)
    } catch (error) {
      console.error('Test error:', error)
    }
  }

  const validation = validateRule(value)

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Eligibility Criteria Editor</CardTitle>
              <CardDescription>
                Define the rules that determine who is eligible for this scheme
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'visual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('visual')}
              >
                Visual
              </Button>
              <Button
                variant={activeTab === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('json')}
              >
                JSON
              </Button>
              <Button
                variant={activeTab === 'test' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('test')}
              >
                Test
              </Button>
            </div>
          </div>
          
          {!validation.valid && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Validation Errors:</strong>
                <ul className="list-disc list-inside mt-1">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {activeTab === 'visual' && (
            <div className="space-y-4">
              <div>
                <Label>Quick Patterns</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Start with a common pattern and customize it
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePatternSelect('ageRange')}
                  >
                    Age Range
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePatternSelect('incomeBelow')}
                  >
                    Income Limit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePatternSelect('hasCategory')}
                  >
                    Category
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePatternSelect('residentOf')}
                  >
                    Residence
                  </Button>
                </div>
              </div>

              <div>
                <Label>Visual Rule Builder</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Advanced visual editor coming soon. For now, use the JSON tab to define custom rules.
                </p>
                <div className="bg-gray-50 border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-gray-500">
                    Drag-and-drop rule builder interface will be available here
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="jsonEditor">JSON-Logic Rule</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Define eligibility criteria using{' '}
                  <a 
                    href="https://jsonlogic.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    JSON-Logic syntax
                  </a>
                </p>
                <Textarea
                  id="jsonEditor"
                  value={jsonValue}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder="Enter JSON-Logic rule..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Common Variables:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <Badge variant="secondary">age</Badge>
                  <Badge variant="secondary">annualIncome</Badge>
                  <Badge variant="secondary">category</Badge>
                  <Badge variant="secondary">residenceArea</Badge>
                  <Badge variant="secondary">gender</Badge>
                  <Badge variant="secondary">maritalStatus</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Test Cases</Label>
                  <p className="text-sm text-gray-600">
                    Test your eligibility rules with different scenarios
                  </p>
                </div>
                <Button onClick={addTestCase} size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Test Case
                </Button>
              </div>

              {testCases.length > 0 ? (
                <div className="space-y-4">
                  {testCases.map((testCase) => (
                    <Card key={testCase.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <Input
                          value={testCase.name}
                          onChange={(e) => updateTestCase(testCase.id, { name: e.target.value })}
                          className="max-w-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTestCase(testCase.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <Label className="text-xs">Age</Label>
                          <Input
                            type="number"
                            value={testCase.input.age as number || ''}
                            onChange={(e) => updateTestCase(testCase.id, {
                              input: { ...testCase.input, age: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Income</Label>
                          <Input
                            type="number"
                            value={testCase.input.annualIncome as number || ''}
                            onChange={(e) => updateTestCase(testCase.id, {
                              input: { ...testCase.input, annualIncome: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select 
                            onValueChange={(value) => updateTestCase(testCase.id, {
                              input: { ...testCase.input, category: value }
                            })}
                            defaultValue={testCase.input.category as string}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="obc">OBC</SelectItem>
                              <SelectItem value="sc">SC</SelectItem>
                              <SelectItem value="st">ST</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Label className="text-xs">Expected Result:</Label>
                        <Select 
                          onValueChange={(value) => updateTestCase(testCase.id, {
                            expectedOutput: value === 'true'
                          })}
                          defaultValue={testCase.expectedOutput.toString()}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Eligible</SelectItem>
                            <SelectItem value="false">Not Eligible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))}

                  <div className="flex gap-3">
                    <Button onClick={runTests} className="bg-blue-600 hover:bg-blue-700">
                      <BeakerIcon className="h-4 w-4 mr-2" />
                      Run Tests
                    </Button>
                  </div>

                  {testResults && (
                    <Card className={`mt-4 ${testResults.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <CardHeader>
                        <CardTitle className={`text-sm ${testResults.passed ? 'text-green-800' : 'text-red-800'}`}>
                          Test Results: {testResults.passed ? 'All Passed ✓' : 'Some Failed ✗'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {testResults.results.map((result: any, index: number) => (
                            <div 
                              key={index} 
                              className={`p-2 rounded text-sm ${
                                result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <strong>{testCases[index]?.name}:</strong> 
                              Expected {result.expected ? 'Eligible' : 'Not Eligible'}, 
                              Got {result.actual ? 'Eligible' : 'Not Eligible'} 
                              {result.passed ? '✓' : '✗'}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No test cases defined yet.</p>
                  <p className="text-sm">Add test cases to validate your eligibility rules.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}