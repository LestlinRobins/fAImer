
import React, { useState } from 'react';
import { MessageCircle, ThumbsUp, Reply, Plus, Search, ArrowLeft, AlertTriangle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface FarmerForumScreenProps {
  onBack?: () => void;
}

const FarmerForumScreen: React.FC<FarmerForumScreenProps> = ({ onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeSection, setActiveSection] = useState<'alerts' | 'discussions'>('alerts');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'crops'
  });
  const [newAlert, setNewAlert] = useState({
    title: '',
    description: '',
    alertType: 'warning',
    location: '',
    urgency: 'medium'
  });
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      title: 'Pest Attack Warning - Aphids',
      description: 'High aphid activity reported in tomato fields. Immediate action recommended.',
      alertType: 'danger',
      location: 'Punjab Region',
      author: 'Agricultural Department',
      urgency: 'high',
      timeAgo: '1 hour ago',
      responses: 5
    },
    {
      id: 2,
      title: 'Weather Alert - Heavy Rain Expected',
      description: 'Monsoon intensity expected to increase. Protect crops from waterlogging.',
      alertType: 'warning',
      location: 'Maharashtra',
      author: 'Weather Service',
      urgency: 'high',
      timeAgo: '3 hours ago',
      responses: 12
    },
    {
      id: 3,
      title: 'Market Price Drop - Wheat',
      description: 'Wheat prices have dropped by 15%. Consider storage options.',
      alertType: 'info',
      location: 'National',
      author: 'Market Analysis Team',
      urgency: 'medium',
      timeAgo: '6 hours ago',
      responses: 8
    }
  ]);
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: 'Rajesh Kumar',
      title: 'Best fertilizer for tomato plants?',
      content: 'I am growing tomatoes for the first time. Which fertilizer should I use for better yield?',
      category: 'crops',
      replies: 12,
      likes: 8,
      timeAgo: '2 hours ago',
      isAnswered: true
    },
    {
      id: 2,
      author: 'Priya Sharma',
      title: 'Dealing with aphids on chilli plants',
      content: 'My chilli plants are infested with aphids. Looking for organic solutions.',
      category: 'diseases',
      replies: 6,
      likes: 15,
      timeAgo: '4 hours ago',
      isAnswered: false
    },
    {
      id: 3,
      author: 'Mohan Singh',
      title: 'Current market rates in Delhi',
      content: 'Can anyone share the latest mandi rates for wheat and rice in Delhi?',
      category: 'market',
      replies: 3,
      likes: 5,
      timeAgo: '1 day ago',
      isAnswered: true
    },
    {
      id: 4,
      author: 'Sunita Devi',
      title: 'Drip irrigation setup cost',
      content: 'Planning to install drip irrigation for 2 acres. What should be the expected cost?',
      category: 'technology',
      replies: 18,
      likes: 22,
      timeAgo: '2 days ago',
      isAnswered: true
    },
    {
      id: 5,
      author: 'Ramesh Patel',
      title: 'Weather affecting cotton crop',
      content: 'Unexpected rain has damaged my cotton field. What steps should I take now?',
      category: 'weather',
      replies: 9,
      likes: 11,
      timeAgo: '3 days ago',
      isAnswered: false
    }
  ]);

  const categories = [
    { id: 'all', label: 'All Topics', count: 48 },
    { id: 'crops', label: 'Crops & Seeds', count: 15 },
    { id: 'diseases', label: 'Diseases & Pests', count: 12 },
    { id: 'market', label: 'Market Prices', count: 8 },
    { id: 'technology', label: 'Farm Tech', count: 7 },
    { id: 'weather', label: 'Weather & Climate', count: 6 }
  ];

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  const handleCreatePost = () => {
    if (newPost.title.trim() && newPost.content.trim()) {
      const post = {
        id: Date.now(), // Simple ID generation
        author: 'You', // In a real app, this would come from user authentication
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        replies: 0,
        likes: 0,
        timeAgo: 'just now',
        isAnswered: false
      };
      
      setPosts([post, ...posts]); // Add new post to the beginning
      setNewPost({ title: '', content: '', category: 'crops' }); // Reset form
      setIsDialogOpen(false); // Close dialog
    }
  };

  const handleCreateAlert = () => {
    if (newAlert.title.trim() && newAlert.description.trim() && newAlert.location.trim()) {
      const alert = {
        id: Date.now(), // Simple ID generation
        title: newAlert.title,
        description: newAlert.description,
        alertType: newAlert.alertType,
        location: newAlert.location,
        author: 'You',
        urgency: newAlert.urgency,
        timeAgo: 'just now',
        responses: 0
      };
      
      setAlerts([alert, ...alerts]); // Add new alert to the beginning
      setNewAlert({ title: '', description: '', alertType: 'warning', location: '', urgency: 'medium' }); // Reset form
      setIsAlertDialogOpen(false); // Close dialog
    }
  };

  const getAlertColor = (alertType: string) => {
    const colors = {
      danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700',
      info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
    };
    return colors[alertType as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[urgency as keyof typeof colors] || 'bg-gray-500';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      crops: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      diseases: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      market: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      technology: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      weather: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="pb-20 bg-gray-50 dark:bg-background min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 text-white p-4 shadow-lg">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="mr-3 text-white hover:bg-white/20 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Farmer Forum</h1>
            <p className="text-orange-100 dark:text-orange-200 text-sm">Connect with fellow farmers</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Section */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <input
            type="text"
            placeholder="Search discussions and alerts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Categories Dropdown */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base dark:text-white">Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {categories.map((category) => (
                  <SelectItem 
                    key={category.id} 
                    value={category.id}
                    className="dark:text-white dark:focus:bg-gray-600"
                  >
                    {category.label} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Toggle Section for Alerts and Discussions */}
        <div className="space-y-3">
          {/* Toggle Buttons */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 max-w-sm">
            <Button
              variant={activeSection === 'alerts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('alerts')}
              className={`flex-1 ${
                activeSection === 'alerts'
                  ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white'
                  : 'dark:text-white dark:hover:bg-gray-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts ({alerts.length})
            </Button>
            <Button
              variant={activeSection === 'discussions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('discussions')}
              className={`flex-1 ${
                activeSection === 'discussions'
                  ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white'
                  : 'dark:text-white dark:hover:bg-gray-700'
              }`}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Discussions ({filteredPosts.length})
            </Button>
          </div>

          {/* Conditional Content Rendering */}
          {activeSection === 'alerts' ? (
            /* Active Alerts Section */
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Active Alerts
              </h2>
              {alerts.map((alert) => (
                <Card key={alert.id} className={`hover:shadow-md dark:hover:shadow-xl transition-shadow border-l-4 ${getAlertColor(alert.alertType)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getUrgencyColor(alert.urgency)}`}></div>
                        <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                          {alert.alertType.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                          {alert.location}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{alert.timeAgo}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{alert.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{alert.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">By {alert.author}</span>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs">{alert.responses}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          <Reply className="h-3 w-3 mr-1" />
                          Respond
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Recent Discussions Section */
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Recent Discussions
              </h2>
              {filteredPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-md dark:hover:shadow-xl transition-shadow dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(post.category)}>
                          {post.category}
                        </Badge>
                        {post.isAnswered && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Answered
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{post.timeAgo}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{post.content}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">By {post.author}</span>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span className="text-xs">{post.likes}</span>
                        </div>
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs">{post.replies}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Popover open={isFabOpen} onOpenChange={setIsFabOpen}>
          <PopoverTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="end" 
            className="w-48 p-2 dark:bg-gray-800 dark:border-gray-700 mb-2"
          >
            <div className="space-y-2">
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (open) setIsFabOpen(false);
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start dark:text-white dark:hover:bg-gray-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-3" />
                    New Post
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={isAlertDialogOpen} onOpenChange={(open) => {
                setIsAlertDialogOpen(open);
                if (open) setIsFabOpen(false);
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start dark:text-white dark:hover:bg-gray-700"
                  >
                    <Bell className="h-4 w-4 mr-3" />
                    New Alert
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* New Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category" className="dark:text-white">Category</Label>
              <Select 
                value={newPost.category} 
                onValueChange={(value) => setNewPost({...newPost, category: value})}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectItem value="crops" className="dark:text-white dark:focus:bg-gray-600">Crops & Seeds</SelectItem>
                  <SelectItem value="diseases" className="dark:text-white dark:focus:bg-gray-600">Diseases & Pests</SelectItem>
                  <SelectItem value="market" className="dark:text-white dark:focus:bg-gray-600">Market Prices</SelectItem>
                  <SelectItem value="technology" className="dark:text-white dark:focus:bg-gray-600">Farm Tech</SelectItem>
                  <SelectItem value="weather" className="dark:text-white dark:focus:bg-gray-600">Weather & Climate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="title" className="dark:text-white">Title</Label>
              <Input
                id="title"
                placeholder="What's your question or topic?"
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            
            <div>
              <Label htmlFor="content" className="dark:text-white">Content</Label>
              <Textarea
                id="content"
                placeholder="Describe your question or share your knowledge..."
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                rows={4}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 resize-none"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePost}
                disabled={!newPost.title.trim() || !newPost.content.trim()}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                Create Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Alert Dialog */}
      <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white flex items-center">
              <Bell className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
              Create New Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alertType" className="dark:text-white">Alert Type</Label>
                <Select 
                  value={newAlert.alertType} 
                  onValueChange={(value) => setNewAlert({...newAlert, alertType: value})}
                >
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select alert type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                    <SelectItem value="danger" className="dark:text-white dark:focus:bg-gray-600">🔴 Danger</SelectItem>
                    <SelectItem value="warning" className="dark:text-white dark:focus:bg-gray-600">🟡 Warning</SelectItem>
                    <SelectItem value="info" className="dark:text-white dark:focus:bg-gray-600">🔵 Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="urgency" className="dark:text-white">Urgency</Label>
                <Select 
                  value={newAlert.urgency} 
                  onValueChange={(value) => setNewAlert({...newAlert, urgency: value})}
                >
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                    <SelectItem value="high" className="dark:text-white dark:focus:bg-gray-600">High</SelectItem>
                    <SelectItem value="medium" className="dark:text-white dark:focus:bg-gray-600">Medium</SelectItem>
                    <SelectItem value="low" className="dark:text-white dark:focus:bg-gray-600">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="alertTitle" className="dark:text-white">Alert Title</Label>
              <Input
                id="alertTitle"
                placeholder="What's the alert about?"
                value={newAlert.title}
                onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <div>
              <Label htmlFor="location" className="dark:text-white">Location/Region</Label>
              <Input
                id="location"
                placeholder="e.g., Punjab, Maharashtra, National"
                value={newAlert.location}
                onChange={(e) => setNewAlert({...newAlert, location: e.target.value})}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            
            <div>
              <Label htmlFor="alertDescription" className="dark:text-white">Description</Label>
              <Textarea
                id="alertDescription"
                placeholder="Describe the alert details and recommended actions..."
                value={newAlert.description}
                onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                rows={4}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 resize-none"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAlertDialogOpen(false)}
                className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAlert}
                disabled={!newAlert.title.trim() || !newAlert.description.trim() || !newAlert.location.trim()}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                Create Alert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerForumScreen;
