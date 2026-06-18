import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatBot } from '@/contexts/ChatBotContext';

// UI Components
import {
  Settings, Plus, Trash2, Copy, Check, MessageSquare, Clock, Send, Users,
  Globe, ChevronRight, ArrowLeft, Pencil, X, Image as ImageIcon, Upload,
  Search, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Utilities & Services
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";
import { AdminLayout } from '@/components/AdminLayout';
import { apiUrl } from '@/services/EventServices';
import { chatBotService, ChatBotChat } from '@/services/chatBotService';
import { getCountryShortCode } from '@/lib/countryCode';

// --- Types & Interfaces ---

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Website {
  id: number;
  name: string;
  icon: string;
  website_id: string;
  script: string;
}

interface PredefinedResponse {
  id: number;
  message: string;
}

interface ChatListItem {
  id: string;
  type: string;
  name: string;
  email?: string;
  preview: string;
  time: string;
  unread: number;
  assignee: string;
  status: string;
  countryCode?: string;
  website: string;
  messageCount: number;
  createdAt: number;
  clientName: string;
}



export default function ChatBotPage() {
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState('last_7_days');
  const [volumeInterval, setVolumeInterval] = useState<4 | 6 | 8>(6);
  const [overviewData, setOverviewData] = useState<any[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [websites, setWebsites] = useState<Website[]>([]);
  const [websitesLoading, setWebsitesLoading] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Predefined Responses State
  const [predefinedResponses, setPredefinedResponses] = useState<PredefinedResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [newResponseText, setNewResponseText] = useState('');
  const [responseSearchQuery, setResponseSearchQuery] = useState('');
  const [editingResponseId, setEditingResponseId] = useState<number | null>(null);
  const [editResponseText, setEditResponseText] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState('all'); // active (Open/Pending), Open, Pending, Closed, Converted, all
  const [websiteFilter, setWebsiteFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // API Data State
  const [chats, setChats] = useState<ChatBotChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [totalChats, setTotalChats] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { unreadCounts, lastUpdatedChatId, lastUpdatedChatData, setActiveChatId, setInitialUnreadCounts } = useChatBot();

  // UI Display state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('websites');

  // Get user ID from localStorage
  const getUserId = (): number => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || 1;
      }
      return 1;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 1;
    }
  };

  const fetchWebsites = useCallback(async () => {
    try {
      setWebsitesLoading(true);
      const userId = getUserId();
      const response = await chatBotService.getWebsites(userId);
      if (response.success && response.data) {
        setWebsites(response.data as unknown as Website[]);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setWebsitesLoading(false);
    }
  }, []);

  const fetchPredefinedResponses = useCallback(async (search?: string) => {
    try {
      setResponsesLoading(true);
      const userId = getUserId();
      const response = await chatBotService.getPredefinedResponses(userId, search);
      if (response.success && response.data) {
        setPredefinedResponses(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching predefined responses:', error);
    } finally {
      setResponsesLoading(false);
    }
  }, []);

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const userId = getUserId();
      const response = await chatBotService.getChatOverview(userId, {
        date_period: selectedDuration,
        hour_split: volumeInterval
      });
      if (response.success && response.response?.data) {
        setOverviewData(response.response.data);
      }
    } catch (error) {
      console.error('Error fetching chat overview:', error);
    } finally {
      setOverviewLoading(false);
    }
  }, [selectedDuration, volumeInterval]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const fetchChats = useCallback(async () => {
    try {
      setChatsLoading(true);
      const userId = getUserId();
      const params = {
        limit: itemsPerPage,
        page: currentPage,
        status: statusFilter === 'all' ? undefined : statusFilter,
        website_id: websiteFilter === 'all' ? undefined : websites.find(w => w.name === websiteFilter)?.website_id,
        search: searchQuery.trim() || undefined
      };

      const response = await chatBotService.getChatList(userId, params);
      if (response.success && response.response) {
        const chatData = response.response.chats || [];
        setChats(chatData);
        setTotalPages(response.response.total_pages || 1);
        setTotalChats(response.response.total_chats || 0);

        // Seed unread counts from initial data
        const initialCounts: Record<number, number> = {};
        chatData.forEach(chat => {
          // Explicitly check !== undefined so 0 securely clears cached unread badges
          if (chat.message_count !== undefined && chat.message_count !== null) {
            initialCounts[Number(chat.id)] = chat.message_count;
          }
        });
        setInitialUnreadCounts(initialCounts);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  }, [currentPage, statusFilter, websiteFilter, searchQuery, websites]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    if (isSettingsOpen && activeSettingsTab === 'responses') {
      const handler = setTimeout(() => {
        fetchPredefinedResponses(responseSearchQuery);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [isSettingsOpen, activeSettingsTab, responseSearchQuery, fetchPredefinedResponses]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Set active chat to null when on the list page
  useEffect(() => {
    setActiveChatId(null);
  }, [setActiveChatId]);

  // Handle reordering and adding when a chat is updated via WS
  useEffect(() => {
    if (lastUpdatedChatId) {
      setChats(prev => {
        const chatIdx = prev.findIndex(c => Number(c.id) === Number(lastUpdatedChatId));
        if (chatIdx > -1) {
          const updatedChats = [...prev];
          // Use real-time data if provided, otherwise move existing
          if (lastUpdatedChatData) {
            updatedChats[chatIdx] = lastUpdatedChatData as any;
          }
          const [movedChat] = updatedChats.splice(chatIdx, 1);
          return [movedChat, ...updatedChats];
        } else if (lastUpdatedChatData) {
          // If the chat is NOT in the current list, but we have its data, prepend it
          // This allows new chats to appear instantly on top
          return [lastUpdatedChatData as any, ...prev];
        }
        return prev;
      });
    }
  }, [lastUpdatedChatId, lastUpdatedChatData]);

  const openSettings = (tab: string) => {
    setActiveSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, websiteFilter]);

  const handleSelectChat = (id: string | number) => {
    navigate(`/chat-bot/${id}`);
  };

  const formatDateString = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Treat as local time by stripping 'Z' if present
      const cleanDateString = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
      const date = new Date(cleanDateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTimeString = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const cleanDateString = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
      const date = new Date(cleanDateString);
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '';
    }
  };

  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Treat as local time by stripping 'Z' if present to avoid timezone shift
      const cleanDateString = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
      const past = new Date(cleanDateString);
      const now = new Date();
      let diffInMs = now.getTime() - past.getTime();

      // Handle future dates (clock skew)
      if (diffInMs < 0) diffInMs = 0;

      const seconds = Math.floor(diffInMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      }

      if (hours >= 1) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      }

      if (minutes >= 1) {
        return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
      }

      return 'Just now';
    } catch (e) {
      return formatDateString(dateString);
    }
  };

  const handleAddWebsite = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const userId = getUserId();
      // Use crypto.randomUUID() if available (secure contexts), otherwise fallback to custom implementation
      const websiteId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
      const scriptPath = `${apiUrl}/chat-widget/widget.js`;
      const scriptTag = `<script src="${scriptPath}" data-id="${websiteId}"></script>`;

      const formData = new FormData();
      const dataPayload = JSON.stringify({
        name: newCompanyName,
        website_id: websiteId,
        script: scriptTag
      });

      formData.append('data', dataPayload);
      if (selectedFile) {
        formData.append('icon', selectedFile);
      }

      const response = await chatBotService.createWebsite(userId, formData);
      if (response.success) {
        toast({ title: 'Success', description: 'Website chatbot script created.' });
        setNewCompanyName('');
        setNewLogoUrl('');
        setSelectedFile(null);
        fetchWebsites(); // Refresh the list
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to create website.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error adding website:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while adding the website.',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveWebsite = async (id: number) => {
    try {
      const userId = getUserId();
      const response = await chatBotService.deleteWebsite(userId, id);
      if (response.success) {
        toast({ title: 'Success', description: 'Website chatbot script deleted.' });
        fetchWebsites(); // Refresh the list
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete website.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error removing website:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the website.',
        variant: 'destructive'
      });
    }
  };

  const handleAddResponse = async () => {
    if (!newResponseText.trim()) return;
    try {
      const userId = getUserId();
      const response = await chatBotService.createPredefinedResponse(userId, newResponseText);
      if (response.success) {
        setNewResponseText('');
        fetchPredefinedResponses();
        toast({ title: 'Success', description: 'Predefined response added.' });
      }
    } catch (error) {
      console.error('Error adding response:', error);
      toast({ title: 'Error', description: 'Failed to add response.', variant: 'destructive' });
    }
  };

  const handleRemoveResponse = async (id: number) => {
    try {
      const userId = getUserId();
      const response = await chatBotService.deletePredefinedResponse(userId, id);
      if (response.success) {
        fetchPredefinedResponses();
        toast({ title: 'Success', description: 'Predefined response removed.' });
      }
    } catch (error) {
      console.error('Error removing response:', error);
      toast({ title: 'Error', description: 'Failed to remove response.', variant: 'destructive' });
    }
  };

  const startEditResponse = (resp: PredefinedResponse) => {
    setEditingResponseId(resp.id);
    setEditResponseText(resp.message);
  };

  const saveEditResponse = async () => {
    if (!editingResponseId || !editResponseText.trim()) return;
    try {
      const userId = getUserId();
      const response = await chatBotService.updatePredefinedResponse(userId, editingResponseId, editResponseText);
      if (response.success) {
        setEditingResponseId(null);
        fetchPredefinedResponses();
        toast({ title: 'Success', description: 'Predefined response updated.' });
      }
    } catch (error) {
      console.error('Error updating response:', error);
      toast({ title: 'Error', description: 'Failed to update response.', variant: 'destructive' });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const copyScript = (website_id: string) => {
    const script = `<script src="${apiUrl}/chat-widget/widget.js" data-id="${website_id}"></script>`;
    navigator.clipboard.writeText(script);
    setCopiedId(website_id);
    toast({ title: 'Script Copied', description: 'Widget script has been copied to clipboard.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getChatVolumeByTime = () => {
    const slots = [];
    for (let i = 0; i < 24; i += volumeInterval) {
      const start = i;
      const end = i + volumeInterval;
      const formatTime = (h: number) => h.toString().padStart(2, '0') + ':00';

      // Artificial data for demo
      const counts: Record<number, number[]> = {
        4: [2, 4, 8, 3, 5, 2],
        6: [6, 11, 8, 4],
        8: [10, 15, 6]
      };
      const countIndex = i / volumeInterval;

      slots.push({
        label: `${formatTime(start)} - ${formatTime(end === 24 ? 0 : end)}`,
        start,
        end,
        count: counts[volumeInterval][countIndex] || 0
      });
    }
    return slots;
  };

  const renderMessageWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <AdminLayout title="Chat Bot Management">
      <div className="space-y-6 p-4">
        <Card>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <div className='space-y-3'>
                <div className="flex items-center gap-3">
                  <CardTitle>
                    Chat Bot Management
                  </CardTitle>
                </div>
                <CardDescription>
                  Manage your customer conversations and widget settings.
                </CardDescription>

              </div>
              <div className="flex gap-2">

                <Button
                  variant="outline"
                  onClick={() => openSettings('websites')}
                  className="gap-2 shadow-sm"
                >
                  <Settings className="w-4 h-4" /> Settings
                </Button>

                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-6 overflow-hidden bg-background">
                    <DialogHeader className="mb-2">
                      <DialogTitle className="text-xl">
                        {activeSettingsTab === 'responses' ? 'Predefined Responses' : 'Chat Bot Settings'}
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="flex-1 flex flex-col mt-2 min-h-0">
                      <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg">
                        <TabsTrigger value="websites" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Websites</TabsTrigger>
                        <TabsTrigger value="responses" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Responses</TabsTrigger>
                      </TabsList>

                      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm mt-4 overflow-hidden flex flex-col min-h-0">
                        <TabsContent value="websites" className="flex-1 m-0 h-full p-6 outline-none flex flex-col min-h-0 data-[state=inactive]:hidden">
                          <div className="space-y-6 flex-1 flex flex-col min-h-0">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">Websites</h3>
                            <div className="space-y-5 flex-1 flex flex-col min-h-0">
                              <div className="flex gap-3 items-start">
                                <div className="flex-1 flex flex-col gap-3">
                                  <div className="flex gap-3 items-center">
                                    <div className="relative group">
                                      <input
                                        type="file"
                                        ref={logoInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                      />
                                      <Button
                                        variant="outline"
                                        className="h-10 w-10 p-0 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all overflow-hidden relative"
                                        onClick={() => logoInputRef.current?.click()}
                                      >
                                        {newLogoUrl ? (
                                          <img src={newLogoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                          <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                        )}
                                      </Button>
                                    </div>
                                    <Input
                                      placeholder="Website label (e.g. Cloudstick)"
                                      value={newCompanyName}
                                      onChange={e => setNewCompanyName(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleAddWebsite()}
                                      className="flex-1 bg-background shadow-sm border-border h-10"
                                    />
                                  </div>
                                </div>
                                <Button onClick={handleAddWebsite} className="bg-primary text-primary-foreground shadow-sm h-10 px-6">
                                  <Plus className="w-4 h-4 mr-2" /> Add
                                </Button>
                              </div>

                              <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                                <div className="divide-y divide-border flex-1 overflow-y-auto">
                                  {websitesLoading ? (
                                    <div className="p-10 text-center text-muted-foreground text-sm">Loading websites...</div>
                                  ) : websites.map(website => (
                                    <div key={website.id} className="flex flex-col gap-3 p-5 hover:bg-muted/30 transition-colors">
                                      <div className="flex items-start justify-between p-1">
                                        <div className="flex items-center gap-3">
                                          {website.icon ? (
                                            <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center bg-background shadow-sm overflow-hidden">
                                              <img src={`${website.icon}`} alt={website.name} className="w-6 h-6 object-contain" />
                                            </div>
                                          ) : (
                                            <Globe className="w-5 h-5 text-muted-foreground/60" />
                                          )}
                                          <div className="flex flex-col">
                                            <span className="font-medium text-foreground text-[15px]">{website.name}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button variant="outline" size="sm" className="h-8 shadow-sm bg-background" onClick={() => copyScript(website.website_id)}>
                                            {copiedId === website.website_id ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
                                            <span className="text-muted-foreground">Copy Script</span>
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveWebsite(website.id)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      <div className="pl-11 space-y-4 pt-1">
                                        <div className="bg-muted border border-border p-2.5 rounded-lg text-xs font-mono break-all whitespace-normal text-muted-foreground cursor-pointer hover:border-border hover:bg-muted/80 transition-colors focus:outline-primary shadow-sm" onClick={() => copyScript(website.website_id)} title="Click to copy script">
                                          {website.script}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {!websitesLoading && websites.length === 0 && (
                                    <div className="p-10 text-center text-muted-foreground/50 text-sm">No websites registered yet.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="responses" className="flex-1 m-0 h-full p-6 outline-none flex flex-col min-h-0 data-[state=inactive]:hidden">
                          <div className="space-y-6 flex-1 flex flex-col min-h-0">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">Predefined Responses</h3>
                            <div className="space-y-5 flex-1 flex flex-col min-h-0">
                              <div className="flex gap-3 items-start shrink-0">
                                <Textarea
                                  placeholder="Type a predefined response..."
                                  value={newResponseText}
                                  onChange={e => setNewResponseText(e.target.value)}
                                  className="flex-1 bg-background shadow-sm border-border min-h-[40px] h-10 resize-none overflow-hidden focus-visible:h-auto"
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '40px';
                                    target.style.height = `${target.scrollHeight}px`;
                                  }}
                                />
                                <Button onClick={handleAddResponse} className="bg-primary text-primary-foreground shadow-sm h-10 px-6 shrink-0 mt-0">
                                  <Plus className="w-4 h-4 mr-2" /> Add
                                </Button>
                              </div>

                              <div className="relative group shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search responses..."
                                  value={responseSearchQuery}
                                  onChange={e => setResponseSearchQuery(e.target.value)}
                                  className="pl-10 pr-10 bg-muted/30 border-border"
                                />
                                {responseSearchQuery && (
                                  <button
                                    onClick={() => setResponseSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                                <div className="divide-y divide-border flex-1 overflow-y-auto">
                                  {responsesLoading ? (
                                    <div className="flex flex-col items-center justify-center p-12 gap-3">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                      <span className="text-sm font-medium text-muted-foreground">Loading responses...</span>
                                    </div>
                                  ) : (
                                    <>
                                      {predefinedResponses
                                        .map(resp => (
                                          <div key={resp.id} className="flex items-start border-b border-border justify-between p-4 hover:bg-muted/30 transition-colors group">
                                            {editingResponseId === resp.id ? (
                                              <div className="flex-1 flex flex-col gap-3 mr-4">
                                                <Textarea
                                                  autoFocus
                                                  value={editResponseText}
                                                  onChange={e => setEditResponseText(e.target.value)}
                                                  className="min-h-[40px] shadow-sm resize-none"
                                                  onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = '40px';
                                                    target.style.height = `${target.scrollHeight}px`;
                                                  }}
                                                />
                                                <div className="flex gap-2">
                                                  <Button size="sm" onClick={saveEditResponse}>Save</Button>
                                                  <Button size="sm" variant="outline" onClick={() => setEditingResponseId(null)}>Cancel</Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="flex items-start gap-4 p-1 flex-1">
                                                  <MessageSquare className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                                                  <div className="text-[14px] text-foreground/80 leading-relaxed pr-4 whitespace-pre-wrap break-words">
                                                    {renderMessageWithLinks(resp.message)}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    onClick={() => startEditResponse(resp)}
                                                  >
                                                    <Pencil className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveResponse(resp.id)}
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      {predefinedResponses.length === 0 && (
                                        <div className="p-10 text-center text-muted-foreground/50 text-sm italic">No predefined responses added yet.</div>
                                      )}
                                      {predefinedResponses.length > 0 && predefinedResponses.filter(r => (r.message || '').toLowerCase().includes(responseSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="p-10 text-center text-muted-foreground/50 text-sm italic">No matches found for "{responseSearchQuery}".</div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                      </div>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger className="w-48 bg-background border-border focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overviewData.filter(item => item.title).map((item, index) => (
                <Card
                  key={index}
                  onMouseEnter={() => index === 0 && setIsVolumeOpen(true)}
                  onMouseLeave={() => index === 0 && setIsVolumeOpen(false)}
                  className="relative transition-colors hover:bg-muted/30"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                      {index === 0 && (
                        <Popover open={isVolumeOpen} onOpenChange={setIsVolumeOpen}>
                          <PopoverTrigger asChild>
                            <div className="inline-flex cursor-pointer pointer-events-none">
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary/10">
                                <Info className="h-3.5 w-3.5 text-primary/70" />
                              </Button>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-64 p-4 shadow-lg border-primary/10"
                            align="start"
                            onMouseEnter={() => setIsVolumeOpen(true)}
                            onMouseLeave={() => setIsVolumeOpen(false)}
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-sm">Chats Volume</h4>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-sm">24H</span>
                              </div>
                              <div className="flex items-center gap-1.5 p-1 bg-muted rounded-md mb-2">
                                {[4, 6, 8].map((v) => (
                                  <button
                                    key={v}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVolumeInterval(v as any);
                                    }}
                                    className={cn(
                                      "flex-1 text-[10px] font-bold py-1 px-2 rounded-sm transition-all focus:outline-none focus:ring-0 ring-0 outline-none",
                                      volumeInterval === v
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-background/50"
                                    )}
                                  >
                                    {v}hr
                                  </button>
                                ))}
                              </div>
                              <div className="space-y-4">
                                {(overviewData.find(item => item.volume)?.volume || []).map((slot: any, i: number) => (
                                  <div key={i} className="flex flex-col gap-1.5 text-xs group">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors delay-75">{slot.time}</span>
                                      <span className="font-bold text-foreground">{slot.count}</span>
                                    </div>
                                    <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary/80 group-hover:bg-primary rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min((Number(slot.count) / (Math.max(...(overviewData.find(item => item.volume)?.volume || []).map((s: any) => Number(s.count))) || 1)) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    {item.title.toLowerCase().includes('total') && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                    {item.title.toLowerCase().includes('open') && <Send className="h-4 w-4 text-muted-foreground" />}
                    {item.title.toLowerCase().includes('closed') && <Check className="h-4 w-4 text-muted-foreground" />}
                    {item.title.toLowerCase().includes('response') && <Clock className="h-4 w-4 text-muted-foreground" />}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <p className="text-xs text-muted-foreground">
                      {item.growth}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-3">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Chats</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Total: {totalChats} chats
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or website..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                    <SelectTrigger className="w-full md:w-48 bg-background border-border focus:ring-0 focus:ring-offset-0 focus:outline-none">
                      <SelectValue placeholder="All Websites" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="all">All Websites</SelectItem>
                      {websites.map(w => (
                        <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48 bg-background border-border focus:ring-0 focus:ring-offset-0 focus:outline-none">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Created">Created</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Contact</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead className="w-[30%]">Preview</TableHead>
                      <TableHead>Attended By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chatsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="text-muted-foreground">Loading chats...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : chats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No chats found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      chats.map(chat => (
                        <TableRow key={chat.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSelectChat(chat.id)}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              {getCountryShortCode(chat.country) ? (
                                <img
                                  src={`https://flagcdn.com/w40/${getCountryShortCode(chat.country)}.png`}
                                  width="24"
                                  alt={chat.country}
                                  className="rounded shadow-sm"
                                />
                              ) : (
                                <Globe className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground/90">{chat.client_name || 'Customer'}</span>
                                {unreadCounts[Number(chat.id)] > 0 && (
                                  <Badge className="h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                                    {unreadCounts[Number(chat.id)]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {chat.website?.icon ? (
                                <img src={`${chat.website.icon}`} alt={chat.website?.name} className="w-6 h-6 object-contain" />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <span className="text-sm text-foreground/80">{chat.website?.name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate max-w-[150px] md:max-w-xs block">
                              {chat.preview}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-xs bg-muted text-muted-foreground font-semibold border">
                                  {(chat.attended || 'U').substring(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{chat.attended || 'Unattended'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 capitalize">
                              <Badge variant="outline" className={cn(
                                "font-semibold rounded-full px-3 py-0.5 border-none",
                                (chat.status || '').toLowerCase() === 'created' ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                                  (chat.status || '').toLowerCase() === 'open' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                  (chat.status || '').toLowerCase() === 'closed' ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                                    'bg-slate-500/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400'

                              )}>
                                {(chat.status || '').toLowerCase() === 'converted' ? 'Converted to Ticket' : chat.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex flex-col items-end">
                              <span
                                className="text-foreground/90 font-medium"
                                title={`${formatDateString(chat.created_at)} ${formatTimeString(chat.created_at)}`}
                              >
                                {getRelativeTime(chat.created_at)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-8">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const pages: (number | string)[] = [];
                        const maxVisible = 5;

                        if (totalPages <= maxVisible) {
                          // Show all pages if total pages is 5 or less
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // Always show first page
                          pages.push(1);

                          if (currentPage <= 3) {
                            // Near the beginning: show 1, 2, 3, 4, 5, ..., last
                            for (let i = 2; i <= 5; i++) {
                              pages.push(i);
                            }
                            pages.push('ellipsis');
                            pages.push(totalPages);
                          } else if (currentPage >= totalPages - 2) {
                            // Near the end: show 1, ..., last-4, last-3, last-2, last-1, last
                            pages.push('ellipsis');
                            for (let i = totalPages - 4; i <= totalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            // In the middle: show 1, ..., current-1, current, current+1, ..., last
                            pages.push('ellipsis');
                            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                              pages.push(i);
                            }
                            pages.push('ellipsis');
                            pages.push(totalPages);
                          }
                        }

                        return pages.map((page, index) => {
                          if (page === 'ellipsis') {
                            return (
                              <span key={`ellipsis-${index}`} className="text-muted-foreground/40 px-1 font-bold">
                                ...
                              </span>
                            );
                          }

                          const pageNum = page as number;
                          const isActive = pageNum === currentPage;

                          return (
                            <button
                              key={pageNum}
                              onClick={() => {
                                setCurrentPage(pageNum);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`
                                w-9 h-9 rounded-full flex items-center justify-center
                                transition-all duration-300 transform
                                ${isActive
                                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
                                }
                                font-bold text-xs
                              `}
                            >
                              {pageNum}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}



              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
