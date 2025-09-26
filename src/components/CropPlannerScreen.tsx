import React, { useState, useMemo } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Sprout,
  ArrowLeft,
  X,
  Save,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Bell,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  BarChart3,
  Target,
  Droplets,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface CropPlannerScreenProps {
  onBack?: () => void;
}

interface CropPlan {
  id: number;
  crop: string;
  area: string;
  variety?: string;
  expectedYieldPerAcre?: number;
  currentMarketPrice?: number;
  sowingDate?: string;
  lastWatered?: string;
  fertilizedDate?: string;
  expenses?: number;
}

interface CropData {
  name: string;
  avgYieldPerAcre: number; // kg per acre
  currentPrice: number; // rupees per kg
  season: string;
  growthPeriod: number; // days
  waterRequirement: "High" | "Medium" | "Low";
  tips: string[];
}

const CropPlannerScreen: React.FC<CropPlannerScreenProps> = ({ onBack }) => {
  // Crop database with market data and agricultural info
  // Crop database with market data and agricultural info
  const cropDatabase: Record<string, CropData> = {
    Tomato: {
      name: "Tomato",
      avgYieldPerAcre: 8000, // Reduced to reflect lower-input, smaller plots.
      currentPrice: 28, // Adjusted to a more common, slightly lower local rate.
      season: "Summer",
      growthPeriod: 90,
      waterRequirement: "High",
      tips: [
        "Apply compost before planting",
        "Support with stakes",
        "Watch for blight",
      ],
    },
    Chilli: {
      name: "Chilli",
      avgYieldPerAcre: 3500, // Significant reduction for micro-plots.
      currentPrice: 80, // Lowered price for local, wholesale selling.
      season: "Summer",
      growthPeriod: 120,
      waterRequirement: "Medium",
      tips: [
        "Ensure good drainage",
        "Apply calcium spray",
        "Harvest regularly",
      ],
    },
    Onion: {
      name: "Onion",
      avgYieldPerAcre: 6500, // Reduced yield.
      currentPrice: 20, // Lowered price.
      season: "Winter",
      growthPeriod: 150,
      waterRequirement: "Medium",
      tips: [
        "Plant in raised beds",
        "Reduce watering before harvest",
        "Cure properly after harvest",
      ],
    },
    Rice: {
      name: "Rice",
      avgYieldPerAcre: 2000, // A more realistic yield for non-commercial plots.
      currentPrice: 20, // Lowered price.
      season: "Monsoon",
      growthPeriod: 120,
      waterRequirement: "High",
      tips: [
        "Maintain water levels",
        "Apply nitrogen fertilizer",
        "Watch for brown planthopper",
      ],
    },
    Wheat: {
      name: "Wheat",
      avgYieldPerAcre: 1500, // Reduced for smaller plots and varying soil quality.
      currentPrice: 18, // Lowered price.
      season: "Winter",
      growthPeriod: 120,
      waterRequirement: "Medium",
      tips: [
        "Sow at right time",
        "Apply urea at tillering",
        "Monitor for rust disease",
      ],
    },
    Corn: {
      name: "Corn",
      avgYieldPerAcre: 2800, // Reduced yield.
      currentPrice: 18, // Lowered price.
      season: "Summer",
      growthPeriod: 100,
      waterRequirement: "Medium",
      tips: [
        "Ensure adequate spacing",
        "Side-dress with nitrogen",
        "Watch for corn borer",
      ],
    },
    Potato: {
      name: "Potato",
      avgYieldPerAcre: 12000, // Reduced yield.
      currentPrice: 12, // A very conservative local price.
      season: "Winter",
      growthPeriod: 90,
      waterRequirement: "Medium",
      tips: [
        "Hill the soil around plants",
        "Avoid overwatering",
        "Harvest before flowering",
      ],
    },
    Carrot: {
      name: "Carrot",
      avgYieldPerAcre: 8500, // Reduced yield.
      currentPrice: 35, // A more realistic price for local markets.
      season: "Winter",
      growthPeriod: 75,
      waterRequirement: "Low",
      tips: [
        "Ensure loose soil",
        "Thin seedlings properly",
        "Avoid fresh manure",
      ],
    },
  };
  const [cropPlans, setCropPlans] = useState<CropPlan[]>([
    {
      id: 1,
      crop: "Tomato",
      area: "0.3 acres", // A more realistic plot size for a small farmer
      sowingDate: "2025-03-01",
      lastWatered: "2025-08-20",
      fertilizedDate: "2025-08-15",
      expenses: 8000, // Reduced expenses for a smaller plot
    },
    {
      id: 2,
      crop: "Chilli",
      area: "0.1 acres", // Very small plot for high-value crop
      expenses: 5000,
    },
    {
      id: 3,
      crop: "Carrot", // Changed from Onion to a more common local crop
      area: "0.2 acres", // Small plot size
      expenses: 10000,
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CropPlan | null>(null);
  const [formData, setFormData] = useState<{
    crop: string;
    area: string;
  }>({
    crop: "",
    area: "",
  });

  // Advanced calculation functions
  const parseArea = (areaString: string): number => {
    const match = areaString.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const calculateEstimatedYield = (crop: string, area: string): number => {
    const cropData = cropDatabase[crop];
    if (!cropData) return 0;
    return cropData.avgYieldPerAcre * parseArea(area);
  };

  const calculateExpectedIncome = (crop: string, area: string): number => {
    const cropData = cropDatabase[crop];
    if (!cropData) return 0;
    const estimatedYield = calculateEstimatedYield(crop, area);
    return estimatedYield * cropData.currentPrice;
  };

  const calculateProfitMargin = (
    crop: string,
    area: string,
    expenses: number = 0
  ): number => {
    const expectedIncome = calculateExpectedIncome(crop, area);
    return expectedIncome - expenses;
  };

  const getWeatherIcon = (season: string) => {
    switch (season) {
      case "Summer":
        return <Sun className="h-4 w-4 text-orange-500" />;
      case "Monsoon":
        return <CloudRain className="h-4 w-4 text-blue-500" />;
      case "Winter":
        return <Cloud className="h-4 w-4 text-gray-500" />;
      default:
        return <Sun className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getUpcomingTasks = (plan: CropPlan) => {
    const tasks = [];
    const today = new Date();
    const cropData = cropDatabase[plan.crop];

    if (cropData) {
      // Water reminder (every 3 days)
      if (plan.lastWatered) {
        const lastWater = new Date(plan.lastWatered);
        const daysSinceWater = Math.floor(
          (today.getTime() - lastWater.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceWater >= 3) {
          tasks.push({
            type: "watering",
            message: `Watering overdue by ${daysSinceWater} days`,
            urgency: "high",
          });
        } else if (daysSinceWater === 2) {
          tasks.push({
            type: "watering",
            message: "Watering due tomorrow",
            urgency: "medium",
          });
        }
      }

      // Fertilizer reminder (every 15 days)
      if (plan.fertilizedDate) {
        const lastFertilizer = new Date(plan.fertilizedDate);
        const daysSinceFertilizer = Math.floor(
          (today.getTime() - lastFertilizer.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceFertilizer >= 15) {
          tasks.push({
            type: "fertilizer",
            message: `Fertilizer application due`,
            urgency: "medium",
          });
        }
      }
    }

    return tasks;
  };

  // Memoized calculations for performance
  const analytics = useMemo(() => {
    const totalArea = cropPlans.reduce(
      (sum, plan) => sum + parseArea(plan.area),
      0
    );
    const totalExpectedYield = cropPlans.reduce(
      (sum, plan) => sum + calculateEstimatedYield(plan.crop, plan.area),
      0
    );
    const totalExpectedIncome = cropPlans.reduce(
      (sum, plan) => sum + calculateExpectedIncome(plan.crop, plan.area),
      0
    );
    const totalExpenses = cropPlans.reduce(
      (sum, plan) => sum + (plan.expenses || 0),
      0
    );
    const totalProfit = totalExpectedIncome - totalExpenses;

    const upcomingHarvests = 0; // Removed date-based logic

    const allTasks = cropPlans.flatMap((plan) => getUpcomingTasks(plan));

    return {
      totalArea,
      totalExpectedYield: Math.round(totalExpectedYield),
      totalExpectedIncome: Math.round(totalExpectedIncome),
      totalExpenses,
      totalProfit: Math.round(totalProfit),
      upcomingHarvests,
      pendingTasks: allTasks,
    };
  }, [cropPlans]);

  const handleOpenModal = (plan: CropPlan | null = null) => {
    setSelectedPlan(plan);
    if (plan) {
      setFormData({
        crop: plan.crop,
        area: plan.area,
      });
    } else {
      setFormData({
        crop: "",
        area: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
    setFormData({
      crop: "",
      area: "",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateCropTodoList = async (crop: string, area: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Fallback todo lists for common crops
    const fallbackTodos = {
      tomato: [
        {
          day: 1,
          tasks: [
            "Prepare soil with compost",
            "Test soil pH (6.0-6.8)",
            "Set up irrigation system",
          ],
        },
        {
          day: 2,
          tasks: [
            "Plant tomato seedlings",
            "Install support stakes",
            "Apply base fertilizer",
          ],
        },
        {
          day: 3,
          tasks: [
            "Water seedlings gently",
            "Check for pest signs",
            "Mulch around plants",
          ],
        },
      ],
      rice: [
        {
          day: 1,
          tasks: [
            "Prepare paddy field",
            "Level the field properly",
            "Check water source",
          ],
        },
        {
          day: 2,
          tasks: ["Soak rice seeds", "Prepare seedbed", "Apply organic matter"],
        },
        {
          day: 3,
          tasks: [
            "Transplant seedlings",
            "Maintain water level",
            "Remove weeds",
          ],
        },
      ],
      wheat: [
        {
          day: 1,
          tasks: [
            "Till the soil deeply",
            "Apply farmyard manure",
            "Level the field",
          ],
        },
        {
          day: 2,
          tasks: [
            "Sow wheat seeds",
            "Apply phosphorus fertilizer",
            "Light irrigation",
          ],
        },
        {
          day: 3,
          tasks: [
            "Check germination",
            "Apply nitrogen fertilizer",
            "Monitor for pests",
          ],
        },
      ],
      onion: [
        {
          day: 1,
          tasks: [
            "Prepare raised beds",
            "Add organic compost",
            "Check drainage system",
          ],
        },
        {
          day: 2,
          tasks: [
            "Plant onion seedlings",
            "Space plants properly",
            "Apply base fertilizer",
          ],
        },
        {
          day: 3,
          tasks: ["Light watering", "Remove weeds", "Check for thrips"],
        },
      ],
      default: [
        {
          day: 1,
          tasks: [
            "Prepare soil thoroughly",
            "Test soil conditions",
            "Plan irrigation",
          ],
        },
        {
          day: 2,
          tasks: [
            "Plant/sow seeds",
            "Apply base fertilizer",
            "Set up support if needed",
          ],
        },
        {
          day: 3,
          tasks: [
            "Water appropriately",
            "Monitor growth",
            "Check for pests/diseases",
          ],
        },
      ],
    };

    if (!apiKey) {
      console.error("Gemini API key not found, using fallback todos");
      const cropKey = crop.toLowerCase() as keyof typeof fallbackTodos;
      return fallbackTodos[cropKey] || fallbackTodos.default;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `Generate a 3-day farming todo list for growing ${crop} on ${area} of land. 
      Return ONLY a valid JSON array with this exact format:
      [{"day": 1, "tasks": ["task1", "task2", "task3"]}, {"day": 2, "tasks": ["task4", "task5", "task6"]}, {"day": 3, "tasks": ["task7", "task8", "task9"]}]
      
      Requirements:
      - Each day should have 2-4 specific, actionable farming tasks
      - Focus on practical activities: soil prep, seeding, watering, fertilizing, pest control
      - Tasks should be specific to ${crop} cultivation
      - Consider the land area: ${area}
      - No extra text, just the JSON array`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Clean up the response text
      let cleanText = text;

      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      // Remove any leading/trailing whitespace and newlines
      cleanText = cleanText.trim();

      // Find JSON array boundaries more precisely
      const startIndex = cleanText.indexOf("[");
      const lastIndex = cleanText.lastIndexOf("]");

      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        const jsonString = cleanText.substring(startIndex, lastIndex + 1);

        try {
          const parsed = JSON.parse(jsonString);

          // Validate the structure
          if (Array.isArray(parsed) && parsed.length === 3) {
            const isValid = parsed.every(
              (day) =>
                day.day && Array.isArray(day.tasks) && day.tasks.length > 0
            );

            if (isValid) {
              return parsed;
            }
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
        }
      }

      // If parsing fails, use fallback
      console.warn("Failed to parse Gemini response, using fallback todos");
      const cropKey = crop.toLowerCase() as keyof typeof fallbackTodos;
      return fallbackTodos[cropKey] || fallbackTodos.default;
    } catch (error) {
      console.error("Error generating todo list:", error);
      // Return fallback todos
      const cropKey = crop.toLowerCase() as keyof typeof fallbackTodos;
      return fallbackTodos[cropKey] || fallbackTodos.default;
    }
  };

  const handleSavePlan = async () => {
    if (!formData.crop || !formData.area) {
      alert("Please fill in all fields");
      return;
    }

    // Generate todo list for new plans
    let todoList = null;
    if (!selectedPlan) {
      todoList = await generateCropTodoList(formData.crop, formData.area);

      // Save todo list to localStorage
      if (todoList) {
        localStorage.setItem(
          "cropTodoList",
          JSON.stringify({
            crop: formData.crop,
            area: formData.area,
            todoList: todoList,
            createdAt: new Date().toISOString(),
          })
        );
      }
    }

    if (selectedPlan) {
      // Update existing plan
      setCropPlans((prev) =>
        prev.map((plan) =>
          plan.id === selectedPlan.id ? { ...selectedPlan, ...formData } : plan
        )
      );
    } else {
      // Add new plan
      const newPlan: CropPlan = {
        id: Date.now(),
        ...formData,
      };
      setCropPlans((prev) => [...prev, newPlan]);
    }
    handleCloseModal();
  };

  const handleAddPlan = (newPlan: CropPlan) => {
    setCropPlans([...cropPlans, { ...newPlan, id: Date.now() }]);
    handleCloseModal();
  };

  const handleUpdatePlan = (updatedPlan: CropPlan) => {
    setCropPlans(
      cropPlans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
    );
    handleCloseModal();
  };

  const handleDeletePlan = (id: number) => {
    if (confirm("Are you sure you want to delete this crop plan?")) {
      setCropPlans(cropPlans.filter((plan) => plan.id !== id));
    }
  };

  return (
    <div className="pb-20 bg-background min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Crop Planner
              </h1>
              <p className="text-muted-foreground text-sm">
                Plan your farming calendar with smart analytics
              </p>
            </div>
          </div>
          <Button
            className="w-half bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            size="sm"
            onClick={() => handleOpenModal()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Plan
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-semibold text-foreground">
                {analytics.totalArea.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Total Acres</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-semibold text-foreground">
                {(analytics.totalExpectedYield / 1000).toFixed(1)}t
              </div>
              <div className="text-xs text-muted-foreground">
                Expected Yield
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-semibold text-foreground">
                ₹{(analytics.totalExpectedIncome / 1000).toFixed(0)}k
              </div>
              <div className="text-xs text-muted-foreground">
                Expected Income
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <div className="text-lg font-semibold text-foreground">
                ₹{(analytics.totalProfit / 1000).toFixed(0)}k
              </div>
              <div className="text-xs text-muted-foreground">Est. Profit</div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Reminders */}
        {analytics.pendingTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <Bell className="h-4 w-4 text-orange-600" />
                Upcoming Tasks ({analytics.pendingTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {analytics.pendingTasks.slice(0, 3).map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
                  >
                    {task.type === "watering" && (
                      <Droplets className="h-4 w-4 text-blue-600" />
                    )}
                    {task.type === "fertilizer" && (
                      <Sprout className="h-4 w-4 text-green-600" />
                    )}
                    {task.type === "harvest" && (
                      <Calendar className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="text-foreground">{task.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Crop Plans List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Your Crop Plans ({cropPlans.length})
          </h2>
          {cropPlans.map((plan) => {
            const cropData = cropDatabase[plan.crop];
            const expectedYield = calculateEstimatedYield(plan.crop, plan.area);
            const expectedIncome = calculateExpectedIncome(
              plan.crop,
              plan.area
            );
            const profit = calculateProfitMargin(
              plan.crop,
              plan.area,
              plan.expenses || 0
            );

            return (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-foreground">
                          {plan.crop}
                        </h3>
                        {cropData && getWeatherIcon(cropData.season)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenModal(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
                      <div className="text-center bg-muted/50 p-2 rounded-lg">
                        <div className="font-semibold text-foreground">
                          {plan.area}
                        </div>
                        <div className="text-muted-foreground">Area</div>
                      </div>
                      <div className="text-center bg-muted/50 p-2 rounded-lg">
                        <div className="font-semibold text-green-600">
                          {(expectedYield / 1000).toFixed(1)}t
                        </div>
                        <div className="text-muted-foreground">Est. Yield</div>
                      </div>
                      <div className="text-center bg-muted/50 p-2 rounded-lg">
                        <div className="font-semibold text-blue-600">
                          ₹{(expectedIncome / 1000).toFixed(0)}k
                        </div>
                        <div className="text-muted-foreground">Est. Income</div>
                      </div>
                      <div className="text-center bg-muted/50 p-2 rounded-lg">
                        <div
                          className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          ₹{(profit / 1000).toFixed(0)}k
                        </div>
                        <div className="text-muted-foreground">
                          {profit >= 0 ? "Profit" : "Loss"}
                        </div>
                      </div>
                    </div>

                    {/* Crop Health Tips */}
                    {cropData && cropData.tips && (
                      <div className="bg-muted/50 p-2 rounded-lg text-xs">
                        <div className="flex items-center gap-1 text-foreground font-medium mb-1">
                          <AlertCircle className="h-3 w-3 text-orange-600" />
                          Monthly Tip
                        </div>
                        <div className="text-muted-foreground">
                          {cropData.tips[0]}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add New Plan Button */}
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
          onClick={() => handleOpenModal()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Crop Plan
        </Button>
      </div>

      {/* Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? "Edit Crop Plan" : "Add New Crop Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="crop">Crop Type</Label>
              <Input
                id="crop"
                placeholder="Enter crop type (e.g., Tomato, Rice, Wheat)"
                value={formData.crop}
                onChange={(e) => handleInputChange("crop", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                placeholder="e.g., 1 acre, 0.5 hectare"
                value={formData.area}
                onChange={(e) => handleInputChange("area", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePlan}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {selectedPlan ? "Update Plan" : "Save Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CropPlannerScreen;
