import React, { useState, useRef, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { joinChat, leaveChat } from '@/store/slices/chatBotSlice';
import { useChatBot } from '@/contexts/ChatBotContext';

// UI Components
import {
  ChevronLeft, ChevronRight, CornerUpLeft, Zap, ArrowDown,
  Send, User, Clock, CheckCircle, AlertCircle, Calendar, Check,
  MessageSquare, MessageCircle, Globe, Search, Paperclip, X, Tag, Mail,
  Plus, Mic, Pause, Play, Trash2, Info, Monitor, Smartphone, Cpu, ShieldCheck, History,
  Lock, Eye, Smile, Save, MoreVertical, Download, Maximize2
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Utilities & Hooks
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '../../components/AdminLayout';
import { chatBotService, ChatBotChat, ChatBotWebSite } from '@/services/chatBotService';
import { getCountryShortCode } from '@/lib/countryCode';
import { wsBaseUrl } from '@/services/EventServices';

// --- Types & Interfaces ---

interface ChatMessage {
  id: string;
  author: string;
  isClient: boolean;
  isWhisper?: boolean;
  content: string;
  timestamp: string;
  type?: 'audio' | 'system' | 'text' | 'file';
  duration?: string;
  pageRoute?: string;
  isRead?: boolean;
  profilePic?: string;
  staffId?: string | number;
  filePath?: string;
  fileName?: string;
  isUploading?: boolean;
  subType?: 'single' | 'group-first' | 'group-middle' | 'group-last';
}

interface ChatSession {
  id: string;
  name: string;
  email: string;
  preview: string;
  time: string;
  unread: number;
  assignee: string;
  status: string;
  countryCode: string;
  website: ChatBotWebSite | null;
  department?: string;
  device: string;
  browser: string;
  ip_address: string;
  client_id?: number | string;
}

interface Staff {
  id: number | string;
  full_name: string;
  profile_pic: string;
}

// --- Constants & Mock Data ---
const statusOptions = [
  { value: 'Open', label: 'Open' },
  { value: 'Closed', label: 'Closed' },
];

const SCROLLBAR_HIDE_STYLE = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
} as const;

const CUSTOM_CSS = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for all textareas while maintaining scroll functionality */
  textarea::-webkit-scrollbar {
    display: none;
  }
  textarea {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  /* Widget-aligned Message Radii Styling */
  .msg-bubble-single { border-radius: 20px !important; }

  /* Client (Left) Groups Radii */
  .client-group-first { border-radius: 20px 20px 20px 4px !important; }
  .client-group-middle { border-radius: 4px 20px 20px 4px !important; }
  .client-group-last { border-radius: 4px 20px 20px 20px !important; }

  /* Staff (Right) Groups Radii */
  .staff-group-first { border-radius: 20px 20px 4px 20px !important; }
  .staff-group-middle { border-radius: 20px 4px 4px 20px !important; }
  .staff-group-last { border-radius: 20px 4px 20px 20px !important; }

  /* Media Container with matching radii (Outer 20px - Padding 4px = Inner 16px) */
  .media-wrapper { border-radius: 12px; overflow: hidden; }
  .msg-bubble-single .media-wrapper { border-radius: 16px; }
  
  /* Media and Text combination - flatter bottom corners for media */
  .has-content .media-wrapper { border-radius: 16px 16px 6px 6px !important; }

  .client-group-first .media-wrapper { border-radius: 16px 16px 16px 2px; }
  .client-group-middle .media-wrapper { border-radius: 2px 16px 16px 2px; }
  .client-group-last .media-wrapper { border-radius: 2px 16px 16px 16px; }

  .staff-group-first .media-wrapper { border-radius: 16px 16px 2px 16px; }
  .staff-group-middle .media-wrapper { border-radius: 16px 2px 2px 16px; }
  .staff-group-last .media-wrapper { border-radius: 16px 2px 16px 16px; }

  /* Spacing */
  .msg-container-group-first, .msg-container-group-middle { margin-bottom: 2px !important; }
  .msg-container-group-last, .msg-container-single { margin-bottom: 12px !important; }
`;


const UnreadDivider = () => (
  <div className="flex items-center gap-3 my-6 animate-in fade-in zoom-in duration-500 w-full">
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-rose-200 to-rose-400" />
    <div className="bg-rose-50 text-rose-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-rose-100 shadow-sm flex items-center gap-1.5">
      <AlertCircle className="w-3 h-3" />
      Unread Messages
    </div>
    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-rose-200 to-rose-400" />
  </div>
);

const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg viewBox="0 0 36 36" className="w-6 h-6 transform -rotate-90">
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.2"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-100"
      />
    </svg>
  );
};


// --- Sub-components ---

const ChatBotAudioPlayer = ({ src, isClient, isWhisper }: { src: string; isClient: boolean; isWhisper: boolean }) => {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 min-w-[240px]",
      !isClient && !isWhisper ? "text-white" : "text-current"
    )}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        className="hidden"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-current transition-all shrink-0"
        onClick={handleToggle}
      >
        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
      </Button>
      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
        <div className="flex items-center gap-[2px] h-5 px-1">
          {[40, 70, 45, 90, 65, 30, 80, 55, 95, 40, 60, 85, 50, 75, 35, 90, 45, 65, 30, 80, 55, 95, 40, 60].map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-[2px] rounded-full transition-all duration-300",
                !isClient && !isWhisper ? "bg-white" : "bg-current",
                (currentTime / duration) * 24 > i ? "opacity-100" : "opacity-30"
              )}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold mt-1 tracking-tight tabular-nums">
          {formatTime(remainingTime)}
        </span>
      </div>
    </div>
  );
};

// --- Utility Functions ---

const getStatusBadgeSmall = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'open') return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold';
  if (s === 'closed') return 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-bold';
  if (s === 'created') return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold';
  if (s === 'converted' || s === 'convert to ticket') return 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold';
  return 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 font-bold';
};

const getStatusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'open') return <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold border-none transition-all flex items-center gap-1.5 text-xs"><AlertCircle className="h-3.5 w-3.5" />Open</Badge>;
  if (s === 'closed') return <Badge className="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-bold border-none transition-all flex items-center gap-1.5 text-xs"><CheckCircle className="h-3.5 w-3.5" />Closed</Badge>;
  if (s === 'convert to ticket' || s === 'converted') return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-none flex items-center gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5" />Converted to Ticket</Badge>;
  return <Badge variant="outline" className="flex items-center gap-1.5 text-xs">{status}</Badge>;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    // Treat as local time by stripping 'Z' if present to avoid timezone shift
    const cleanDateString = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
    const date = new Date(cleanDateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
};

const formatSidebarPreview = (preview: string) => {
  if (!preview) return 'No message preview';
  const lower = preview.toLowerCase();
  if (/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(lower)) return '📷 Photo';
  if (/\.(mp4|webm|avi|mov)(\?.*)?$/i.test(lower)) return '🎥 Video';
  if (/\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(lower) || lower.includes('audio_staff_') || lower.includes('[audio message]')) return '🔈 Audio Message';
  if (/\.(pdf|xlsx|xls|csv|doc|docx|txt)(\?.*)?$/i.test(lower)) return '📄 Document';
  return preview;
};

const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const cleanDateString = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
    const past = new Date(cleanDateString);
    const now = new Date();
    let diffInMs = now.getTime() - past.getTime();

    if (diffInMs < 0) diffInMs = 0;

    const seconds = Math.floor(diffInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    if (minutes >= 1) return `${minutes}m ago`;
    return 'Just now';
  } catch (e) {
    return formatDate(dateString);
  }
};

const formatMessageTime = (dateString: string) => {
  if (!dateString) return '';
  const cleanDateString = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
  const date = new Date(cleanDateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isSameMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (isSameMonth) {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } else {
    // Show Year for different months OR older
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
};

const formatMessageAuthor = (m: any, currentUserId: number) => {
  if (m.messager === 'client') {
    return m.message_by || 'Client';
  }

  const nameRaw = m.message_by || 'Employee';
  if (nameRaw.includes('(')) {
    const parts = nameRaw.split('(');
    const displayName = parts[0].trim();
    const realSenderName = parts[1].replace(')', '').trim();
    
    const actualStaffId = m.staff?.id || m.user_id;
    if (Number(actualStaffId) === Number(currentUserId)) {
      return `${displayName} (You)`;
    }
    return displayName;
  }

  const messagedAsStaff = m.messaged_as || m.messaged_as_staff;
  const actualStaff = m.staff;

  // Custom format logic for Staff 
  if (messagedAsStaff && actualStaff) {
    // Both might be objects or messagedAsStaff might be an ID
    const messagedAsId = typeof messagedAsStaff === 'object' ? messagedAsStaff.id : messagedAsStaff;
    const actualStaffId = typeof actualStaff === 'object' ? actualStaff.id : actualStaff;

    if (Number(messagedAsId) === Number(actualStaffId)) {
      return typeof actualStaff === 'object' ? actualStaff.full_name : nameRaw;
    } else if (Number(actualStaffId) === Number(currentUserId)) {
      const name = typeof messagedAsStaff === 'object' ? messagedAsStaff.full_name : nameRaw;
      const cleanName = name.includes('(') ? name.split('(')[0].trim() : name;
      return `${cleanName} (You)`;
    }
  }

  // Exact backend name if 3 are different or objects don't exist
  return nameRaw;
};

const handleViewFile = async (url: string) => {
  const ext = url.split('.').pop()?.split('?')[0].toLowerCase();

  if (ext === 'pdf') {
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write('<div style="font-family: sans-serif; padding: 20px; color: #333;">Loading PDF preview...</div>');
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        newTab.location.href = blobUrl;
      } catch (error) {
        console.error('PDF Preview failed:', error);
        newTab.location.href = url;
      }
    } else {
      window.open(url, '_blank');
    }
  } else if (['xlsx', 'xls', 'doc', 'docx', 'ppt', 'pptx'].includes(ext || '')) {
    const viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}&wdOrigin=BROWSELINK`;
    window.open(viewUrl, '_blank');
  } else {
    window.open(url, '_blank');
  }
};

const getInitials = (name: string) => {
  if (!name) return '';
  const clean = name.replace(/\([^)]*\)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ChatBotDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fake name / Anonymous name state
  const [showFakeNameDialog, setShowFakeNameDialog] = useState(false);
  const [tempFakeName, setTempFakeName] = useState('');

  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const isPrependingRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [newMessage, setNewMessage] = useState('');
  const [responseMode, setResponseMode] = useState<'reply' | 'whisper'>('reply');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSaveFakeName = () => {
    if (!tempFakeName.trim()) return;
    const fakeStaffObj = {
      id: 'fake',
      full_name: tempFakeName.trim(),
      profile_pic: ''
    };
    setSelectedStaff(fakeStaffObj);
    setShowFakeNameDialog(false);
  };

  const handleStaffSelection = (val: string) => {
    if (val === 'add-fake-name') {
      setTempFakeName(selectedStaff?.id === 'fake' ? selectedStaff.full_name : '');
      setShowFakeNameDialog(true);
    } else if (val === 'fake') {
      // Stay as is
    } else {
      setSelectedStaff(staffList.find(s => s.id.toString() === val) || null);
    }
  };

  // Sidebar collapsible state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarPage, setSidebarPage] = useState(1);
  const [hasMoreSidebar, setHasMoreSidebar] = useState(true);
  const [isFetchingOlderSidebar, setIsFetchingOlderSidebar] = useState(false);
  const SIDEBAR_LIMIT = 20;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const CHAT_LIMIT = 20;
  const [isJoined, setIsJoined] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarChats, setSidebarChats] = useState<ChatBotChat[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputOptionsRef = useRef<HTMLDivElement>(null);
  const isJoinedRef = useRef(isJoined);

  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [showInputOptions, setShowInputOptions] = useState(false);

  // Click outside to close input options
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputOptionsRef.current && !inputOptionsRef.current.contains(event.target as Node)) {
        setShowInputOptions(false);
      }
    };
    if (showInputOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInputOptions]);

  const [showClientMeta, setShowClientMeta] = useState(false);
  const [metaTab, setMetaTab] = useState<'details' | 'history'>('details');
  const [ongoingChatId, setOngoingChatId] = useState<string | null>(chatId || null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(Array(24).fill(3));
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isFetchingOlderHistory, setIsFetchingOlderHistory] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [historyChats, setHistoryChats] = useState<ChatBotChat[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Close lightbox on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  const recordingTimerRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagingSocketRef = useRef<WebSocket | null>(null);
  const searchTimeoutRef = useRef<any | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { unreadCounts, markAsRead, lastUpdatedChatId, lastUpdatedChatData, setActiveChatId, setInitialUnreadCounts } = useChatBot();
  const dispatch = useDispatch();
  const joinedChatsFromStore = useSelector((state: RootState) => state.chatBot.joinedChats);
  const [unreadCountSnapshot, setUnreadCountSnapshot] = useState(0);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const [firstUnreadMsgId, setFirstUnreadMsgId] = useState<string | null>(null);
  const unreadMsgRef = useRef<HTMLDivElement>(null);
  const [unreadBelowIds, setUnreadBelowIds] = useState<string[]>([]);
  // Sync ongoingChatId with chatId param
  useEffect(() => {
    if (chatId) {
      setOngoingChatId(chatId);
      setActiveChatId(Number(chatId));

      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : null;

      // Check if already joined in persistent store
      const persistentJoin = joinedChatsFromStore.find(c => c.chatId === Number(chatId));
      if (persistentJoin && persistentJoin.joinedBy === userId) {
        setIsJoined(true);
        // If we have a stored 'joinedAs', we'll try to sync selectedStaff once staffList is loaded
      } else {
        setIsJoined(false); // Reset join status when switching chats if not in store
      }

      // Snapshot the unread count
      const currentUnread = unreadCounts[Number(chatId)] || 0;
      setUnreadCountSnapshot(currentUnread);
      setFirstUnreadMsgId(null);
      setHasInitialScrolled(false);
      setUnreadBelowIds([]);
      setPage(1);
      setHasMore(true);
      setIsFetchingOlder(false);
      lastMsgIdRef.current = null;
      isPrependingRef.current = false;
      setMessages([]); // Clear messages when switching chats
    } else {
      setActiveChatId(null);
      setIsJoined(false);
    }
  }, [chatId]);

  // Reorder sidebar chats when notification arrives
  useEffect(() => {
    if (lastUpdatedChatId) {
      setSidebarChats(prev => {
        const chatIdx = prev.findIndex(c => Number(c.id) === Number(lastUpdatedChatId));
        if (chatIdx > -1) {
          const updated = [...prev];
          const [moved] = updated.splice(chatIdx, 1);
          return [moved, ...updated];
        } else if (lastUpdatedChatData) {
          return [lastUpdatedChatData as any, ...prev];
        }
        return prev;
      });
    }
  }, [lastUpdatedChatId, lastUpdatedChatData]);

  // Fetch sidebar chats (refactored for pagination)
  const loadSidebarChats = useCallback(async (pageNum: number, isSearch: boolean = false) => {
    try {
      if (pageNum === 1) {
        setSidebarLoading(true);
      } else {
        setIsFetchingOlderSidebar(true);
      }

      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : 1;

      const response = await chatBotService.getChatList(userId, {
        search: searchQuery.trim() || undefined,
        limit: SIDEBAR_LIMIT,
        page: pageNum
      });

      if (response.success && response.response) {
        const newChats = response.response.chats || [];

        if (newChats.length < SIDEBAR_LIMIT) {
          setHasMoreSidebar(false);
        }

        setSidebarChats(prev => {
          if (pageNum === 1) return newChats;
          // Filter out any duplicates that might have arrived via WebSocket/real-time
          const existingIds = new Set(prev.map(c => c.id));
          const filteredNew = newChats.filter(c => !existingIds.has(c.id));
          return [...prev, ...filteredNew];
        });

        // Seed unread counts only on first page or refresh
        if (pageNum === 1) {
          const initialCounts: Record<number, number> = {};
          newChats.forEach(chat => {
            if (chat.message_count !== undefined && chat.message_count !== null) {
              initialCounts[Number(chat.id)] = chat.message_count;
            }
          });
          setInitialUnreadCounts(initialCounts);
        }
      } else {
        setHasMoreSidebar(false);
      }
    } catch (error) {
      console.error('Error fetching sidebar chats:', error);
      setHasMoreSidebar(false);
    } finally {
      setSidebarLoading(false);
      setIsFetchingOlderSidebar(false);
    }
  }, [searchQuery]);

  // Initial fetch and search reset
  useEffect(() => {
    setSidebarPage(1);
    setHasMoreSidebar(true);
    loadSidebarChats(1, true);
  }, [searchQuery, loadSidebarChats]);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;

    if (isAtBottom && hasMoreSidebar && !isFetchingOlderSidebar && !sidebarLoading) {
      const nextPage = sidebarPage + 1;
      setSidebarPage(nextPage);
      loadSidebarChats(nextPage);
    }
  };

  // Sync activeChat when chatId or sidebarChats change
  useEffect(() => {
    if (chatId && sidebarChats.length > 0) {
      // Don't overwrite if we already have the deep detail for this exact chat
      if (activeChat?.id === chatId.toString() && activeChat.client_id) {
        return;
      }

      const currentChat = sidebarChats.find((c: ChatBotChat) => c.id.toString() === chatId);
      if (currentChat) {
        setActiveChat({
          id: currentChat.id.toString(),
          name: currentChat.client_name || 'Customer',
          email: currentChat.client?.email || '',
          preview: currentChat.preview,
          time: currentChat.created_at,
          unread: 0,
          assignee: currentChat.attended || 'Unassigned',
          status: currentChat.status,
          countryCode: getCountryShortCode(currentChat.country) || 'us',
          website: currentChat.website || null,
          department: currentChat.department,
          device: currentChat.device,
          browser: currentChat.browser,
          ip_address: currentChat.ip_address,
          client_id: currentChat.client_id,
        });
      }
    }
  }, [chatId, sidebarChats, activeChat?.id, activeChat?.client_id]);
  // Automatically switch response mode based on status
  useEffect(() => {
    if (!activeChat) return;
    const status = activeChat.status?.toLowerCase();
    if (status === 'open') {
      setResponseMode('reply');
    } else {
      setResponseMode('whisper');
    }
  }, [activeChat?.status]);

  // Fetch current chat messages (refactored for pagination)
  const loadMessages = useCallback(async (pageNum: number, isInitial: boolean = false) => {
    if (!chatId) return;

    try {
      if (isInitial) {
        setMessagesLoading(true);
      } else {
        setIsFetchingOlder(true);
      }

      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : 1;

      const response = await chatBotService.getChatMessages(userId, parseInt(chatId), {
        page: pageNum,
        limit: CHAT_LIMIT
      });

      if (response.success && response.data) {
        const chatData = response.data as any;

        // Update active chat details (only on initial load or if needed)
        if (isInitial) {
          setActiveChat({
            id: chatData.id.toString(),
            name: chatData.client_name || 'Customer',
            email: chatData.client?.email || '',
            preview: chatData.preview || '',
            time: chatData.created_at,
            unread: 0,
            assignee: chatData.attended || 'Unassigned',
            status: chatData.status,
            countryCode: getCountryShortCode(chatData.country) || 'us',
            website: chatData.website || null,
            department: chatData.department,
            device: chatData.device,
            browser: chatData.browser,
            ip_address: chatData.ip_address,
            client_id: chatData.client_id,
          });

          if ((chatData as any).is_joined !== undefined) {
            setIsJoined(!!(chatData as any).is_joined);
          }
        }

        if (chatData.messages) {
          const newMessages: ChatMessage[] = chatData.messages.map((m: any) => {
            const isAudio = m.file_path && /\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(m.file_path);
            return {
              id: m.id.toString(),
              author: formatMessageAuthor(m, userId),
              isClient: m.messager === 'client',
              isWhisper: m.message_type === 'whisper' || m.message_type === 'private message',
              content: m.message,
              timestamp: m.created_at,
              type: (m.message_type === 'private log' || m.message_type === 'public log') ? 'system' : (isAudio ? 'audio' : (m.file_path ? 'file' : 'text')),
              pageRoute: m.current_page || '',
              isRead: m.is_read,
              profilePic: (() => {
                const picProvider = m.messaged_as || m.staff;
                return picProvider?.profile_pic ? picProvider.profile_pic.replace(/^\\+/, '') : undefined;
              })(),
              staffId: m.messaged_as || undefined,
              filePath: m.file_path,
              fileName: m.file_path ? m.file_path.split('/').pop()?.split('?')[0] : undefined
            };
          }).reverse();

          if (newMessages.length < CHAT_LIMIT) {
            setHasMore(false);
          }

          if (isInitial) {
            setMessages(newMessages);

            // Handle unread logic on initial load
            const lastReadIdx = [...newMessages].reverse().findIndex(m => m.isRead === true);
            const lastReadChronologicalIdx = lastReadIdx === -1 ? -1 : newMessages.length - 1 - lastReadIdx;
            const junctionIdx = lastReadChronologicalIdx + 1;

            if (junctionIdx < newMessages.length) {
              const firstUnread = newMessages[junctionIdx];
              setFirstUnreadMsgId(firstUnread.id);
              const unreadMsgs = newMessages.slice(junctionIdx);
              setUnreadCountSnapshot(unreadMsgs.length);
              setUnreadBelowIds(unreadMsgs.map(m => m.id));
            } else {
              setUnreadBelowIds([]);
              setUnreadCountSnapshot(0);
            }
          } else {
            // Prepend older messages and restore scroll position
            const container = scrollRef.current;
            const oldScrollHeight = container ? container.scrollHeight : 0;
            const oldScrollTop = container ? container.scrollTop : 0;

            // Wait for DOM update after state change
            isPrependingRef.current = true;
            setMessages(prev => [...newMessages, ...prev]);

            // Adjust scroll after render
            requestAnimationFrame(() => {
              if (container) {
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
                // Reset flag after a small delay to ensure the messages.length effect has run or skipped
                setTimeout(() => { isPrependingRef.current = false; }, 100);
              }
            });
          }
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setHasMore(false);
    } finally {
      setMessagesLoading(false);
      setIsFetchingOlder(false);
    }
  }, [chatId, scrollRef]);

  // Initial fetch
  useEffect(() => {
    if (chatId) {
      loadMessages(1, true);
    }
  }, [chatId, loadMessages]);

  // WebSocket for real-time messages
  useEffect(() => {
    if (!chatId) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any | null = null;

    const connect = () => {
      try {
        const userData = localStorage.getItem('user');
        const userId = userData ? JSON.parse(userData).id : 1;
        const token = localStorage.getItem('token') || '';
        const wsUrl = `${wsBaseUrl}/user/${userId}/ws/chat/${chatId}?token=${token}`;


        ws = new WebSocket(wsUrl);
        messagingSocketRef.current = ws;

        ws.onopen = () => {
          if (messagingSocketRef.current !== ws) {
            messagingSocketRef.current = ws;
          }
        };

        ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            if (response.type === 'message' && response.data) {
              const m = response.data;

              // Only add if not already in messages (avoid duplicates from REST + WS)
              setMessages(prev => {
                const alreadyExists = prev.some(msg => msg.id === m.id.toString());
                if (alreadyExists) return prev;

                // Create the final message object
                const isAudio = m.file_path && /\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(m.file_path);
                const isImg = m.file_path && /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(m.file_path);
                const isVideo = m.file_path && /\.(mp4|webm|avi|mov)(\?.*)?$/i.test(m.file_path);

                const newMsg: ChatMessage = {
                  id: m.id.toString(),
                  author: formatMessageAuthor(m, userId),
                  isClient: m.messager === 'client',
                  isWhisper: m.message_type === 'whisper' || m.message_type === 'private message',
                  content: m.message,
                  timestamp: m.created_at,
                  type: (m.message_type === 'private log' || m.message_type === 'public log') ? 'system' : (isAudio ? 'audio' : (m.file_path ? 'file' : 'text')),
                  pageRoute: m.current_page || '',
                  isRead: m.is_read ?? false,
                  profilePic: (() => {
                    const picProvider = m.messaged_as || m.staff;
                    return picProvider?.profile_pic ? picProvider.profile_pic.replace(/^\\+/, '') : undefined;
                  })(),
                  staffId: m.messaged_as || undefined,
                  filePath: m.file_path,
                  fileName: m.file_path ? m.file_path.split('/').pop()?.split('?')[0] : undefined
                };

                // Check for optimistic match (uploading message from same author)
                // This prevents duplication if the WS echo arrives before the REST response updates the temp ID
                const optimisticMatch = prev.find(msg =>
                  msg.isUploading &&
                  msg.isClient === (m.messager === 'client') &&
                  (!msg.isClient && (
                    msg.content === m.message ||
                    (msg.fileName && m.file_path && m.file_path.includes(msg.fileName))
                  ))
                );

                if (optimisticMatch) {
                  return prev.map(msg => msg.id === optimisticMatch.id ? newMsg : msg);
                }

                return [...prev, newMsg];
              });

              // Update sidebar preview and move to top
              setSidebarChats(prev => {
                const idx = prev.findIndex(c => Number(c.id) === Number(chatId));
                if (idx > -1) {
                  const updated = [...prev];
                  const chat = { ...updated[idx] };
                  chat.preview = m.message || (m.file_path ? m.file_path.split('/').pop() : 'Sent a file');
                  chat.created_at = m.created_at;
                  updated.splice(idx, 1);
                  return [chat, ...updated];
                }
                return prev;
              });

              // Scroll logic moved to a dedicated useEffect for consistency


              // Auto-mark as read if joined
              if (isJoinedRef.current && m.messager === 'client') {
                const markAsReadAsync = async () => {
                  try {
                    const userData = localStorage.getItem('user');
                    const user = userData ? JSON.parse(userData) : { id: 1 };
                    await chatBotService.updateMessageReadStatus(user.id, chatId || '', [{
                      message_id: Number(m.id),
                      is_read: true
                    }]);

                    // Mark locally
                    setMessages(prev => prev.map(msg => msg.id === m.id.toString() ? { ...msg, isRead: true } : msg));

                    // Update global unread context
                    markAsRead(Number(chatId));
                  } catch (err) {
                    console.error('Failed to auto-mark read:', err);
                  }
                };
                markAsReadAsync();
              } else if (!isJoinedRef.current && m.messager === 'client') {
                // If the staff is NOT joined and connected to the chat, the message remains unread.
                setFirstUnreadMsgId(prev => prev || m.id.toString());
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          if (messagingSocketRef.current === ws) {
            messagingSocketRef.current = null;
          }
          if (!event.wasClean) {
            // Reconnect on unexpected close
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws?.close();
        };

      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      messagingSocketRef.current = null;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [chatId]);

  // Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const userData = localStorage.getItem('user');
        const userId = userData ? JSON.parse(userData).id : 1;
        const response = await chatBotService.getStaffList(userId);
        // Correct nested structure based on API response pattern (response.response.data)
        const staffData = (response as any).response?.data || response.data;

        if (response.success && staffData && Array.isArray(staffData)) {
          const mappedStaff: Staff[] = staffData.map((s: any) => ({
            id: s.id,
            full_name: s.full_name,
            profile_pic: s.profile_pic ? s.profile_pic.replace(/^\\+/, '') : `https://ui-avatars.com/api/?name=${s.full_name}&background=random`
          }));
          setStaffList(mappedStaff);

          // Pre-select current user if found in list
          const currentUser = mappedStaff.find(s => s.id === userId);
          if (currentUser) {
            setSelectedStaff(currentUser);
          } else if (mappedStaff.length > 0) {
            setSelectedStaff(mappedStaff[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching staff list:', error);
      }
    };

    fetchStaff();
  }, []);

  // Sync selectedStaff with persistent join if available
  useEffect(() => {
    if (isJoined && staffList.length > 0 && chatId) {
      const persistentJoin = joinedChatsFromStore.find(c => c.chatId === Number(chatId));
      if (persistentJoin && persistentJoin.joinedAs) {
        const staff = staffList.find(s => Number(s.id) === Number(persistentJoin.joinedAs));
        if (staff) {
          setSelectedStaff(staff);
        }
      }
    }
  }, [isJoined, staffList.length, chatId, joinedChatsFromStore]);

  // Fetch history chats by email
  useEffect(() => {
    const fetchHistoryChats = async () => {
      if (!activeChat?.email || metaTab !== 'history') return;

      try {
        setHistoryLoading(true);
        const userData = localStorage.getItem('user');
        const userId = userData ? JSON.parse(userData).id : 1;

        const response = await chatBotService.getChatList(userId, {
          email: activeChat.email,
          limit: 20
        });

        if (response.success && response.response) {
          setHistoryChats(response.response.chats || []);
        }
      } catch (error) {
        console.error('Error fetching history chats:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistoryChats();
  }, [activeChat?.email, metaTab]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
      setShowScrollButton(false);
      setUnreadBelowIds([]);
      setUnreadCountSnapshot(0);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Environment Error",
          description: "Microphone access is only available in secure contexts (HTTPS or localhost). Please check your connection.",
          variant: "destructive"
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingStatus('recording');
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        // Add random spikes to waveform for visual effect
        setWaveformHeights(prev => [...prev.slice(1), Math.floor(Math.random() * 20) + 5]);
      }, 1000);
      setShowInputOptions(false);
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast({ title: "Microphone Error", description: "Please allow microphone access to record audio.", variant: "destructive" });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingStatus('paused');
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingStatus('recording');
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setWaveformHeights(prev => [...prev.slice(1), Math.floor(Math.random() * 20) + 5]);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingStatus('idle');
    setRecordingTime(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopAndSendRecording = () => {
    if (!mediaRecorderRef.current || recordingTime < 1) return cancelRecording();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
      const audioFile = new File([audioBlob], `audio_staff_${Date.now()}.mp3`, { type: 'audio/mpeg' });

      // Clean up the stream
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 1 };
      const userId = user.id;
      const chatIdNum = parseInt(activeChat!.id);

      const messageType = responseMode === 'whisper' ? 'private message' : 'public message';
      const messagedAs = selectedStaff && selectedStaff.id !== userId ? Number(selectedStaff.id) : undefined;

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('data', JSON.stringify({
        message: '',
        message_type: messageType,
        messaged_as: messagedAs
      }));

      try {
        await chatBotService.uploadFile(userId, chatIdNum, formData);
        toast({ title: "Success", description: "Audio message sent successfully." });
      } catch (err) {
        console.error('Failed to upload audio message:', err);
        toast({ title: "Upload Error", description: "Failed to send audio message.", variant: "destructive" });
      }

      cancelRecording();
    };

    mediaRecorderRef.current.stop();
  };

  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && !hasInitialScrolled) {
      if (firstUnreadMsgId && unreadMsgRef.current) {
        unreadMsgRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
      } else {
        scrollToBottom('auto');

        // Handle media layout delay on initial load
        const lastMsgs = messages.slice(-5);
        if (lastMsgs.some(m => !!m.filePath)) {
          setTimeout(() => scrollToBottom('auto'), 100);
          setTimeout(() => scrollToBottom('auto'), 300);
          setTimeout(() => scrollToBottom('auto'), 600);
          setTimeout(() => scrollToBottom('auto'), 1000);
        }
      }
      setHasInitialScrolled(true);
      // Track the last message ID
      if (messages.length > 0) {
        lastMsgIdRef.current = messages[messages.length - 1].id;
      }
    }
  }, [messagesLoading, messages, hasInitialScrolled, firstUnreadMsgId]);

  // Handle automatic scrolling for new messages after initial load
  useEffect(() => {
    if (messages.length > 0 && hasInitialScrolled) {
      const lastMsg = messages[messages.length - 1];
      const isPrepend = isPrependingRef.current || (lastMsgIdRef.current === lastMsg.id && messages.length > 0 && !lastMsg.isUploading);

      // If it's a replacement (same ID but was uploading and now is not), we should scroll
      const isReplacement = lastMsgIdRef.current === lastMsg.id && messages.length > 0;

      // Update the refractory ref
      lastMsgIdRef.current = lastMsg.id;

      // Skip auto-scroll logic if we just prepended history
      if (isPrepend) return;

      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 400; // Increased threshold for files
        const isFromStaff = !lastMsg.isClient && lastMsg.type !== 'system';

        if (isFromStaff || isNearBottom) {
          // Use auto for immediate jump if from staff to feel more responsive, 
          // smooth for others if we were already bottom
          const behavior = isFromStaff ? 'auto' : 'smooth';
          scrollToBottom(behavior as ScrollBehavior);

          // Secondary scroll check to handle media layout delay
          if (lastMsg.filePath) {
            setTimeout(() => scrollToBottom('auto'), 100);
            setTimeout(() => scrollToBottom('auto'), 300);
          }
        } else if (lastMsg.isClient && lastMsg.type !== 'system') {
          setUnreadBelowIds(prev => {
            if (prev.includes(lastMsg.id)) return prev;
            return [...prev, lastMsg.id];
          });
        }
      }
    }
  }, [messages, hasInitialScrolled]);


  // (Removed redundant unreadCountSnapshot auto-scroll effect which violently dragged users to the bottom when clicking Join)

  useEffect(() => {
    let interval: any;
    if (recordingStatus === 'recording') {
      interval = setInterval(() => {
        setWaveformHeights(prev => prev.map(() => Math.floor(Math.random() * 28) + 4));
      }, 70);
    } else if (recordingStatus === 'paused') {
      // Keep state as is but stop animating
    } else {
      setWaveformHeights(Array(24).fill(3));
    }
    return () => clearInterval(interval);
  }, [recordingStatus]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollButton(!isAtBottom);

    // Pagination: Load older messages if scrolled to top
    if (target.scrollTop <= 20 && hasMore && !isFetchingOlder && !messagesLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage);
    }

    // If we reach bottom, clear unread below
    if (isAtBottom) {
      setUnreadBelowIds([]);
    } else if (unreadBelowIds.length > 0) {
      // Decrement logic: remove IDs that are now above the bottom of the viewport
      setUnreadBelowIds(prev => prev.filter(id => {
        const el = document.getElementById(`msg-${id}`);
        if (!el) return true;
        // Keep it if it's still below the current viewport bottom
        return el.offsetTop > target.scrollTop + target.clientHeight;
      }));
    }
  };

  // If staff is joined and has seen all messages (scrolled to bottom), update API and mark local messages read
  useEffect(() => {
    // Rely on hasInitialScrolled to prevent false positives where showScrollButton is false simply because of the initial render phase
    if (isJoined && !showScrollButton && hasInitialScrolled) {
      // 1. Identify local unread messages
      const unreadMessages = messages.filter(m => m.isRead === false);

      if (unreadMessages.length > 0) {
        // 2. Clear snapshot but KEEP firstUnreadMsgId so the visual divider remains for this session
        setUnreadCountSnapshot(0);

        // 3. Update API
        const markRead = async () => {
          try {
            const userData = localStorage.getItem('user');
            const user = userData ? JSON.parse(userData) : { id: 1 };
            const userId = user.id;

            const readStatusInput = unreadMessages.map(m => ({
              message_id: Number(m.id),
              is_read: true
            }));

            await chatBotService.updateMessageReadStatus(userId, chatId || '', readStatusInput);

            // 4. Update local state globally and locally to reflect they are now officially read
            markAsRead(Number(chatId));
            setMessages(prev => prev.map(m => m.isRead === false ? { ...m, isRead: true } : m));
          } catch (err) {
            console.error('Failed to update read status:', err);
          }
        };
        markRead();
      }
    }
  }, [isJoined, showScrollButton, messages, chatId]);

  useEffect(() => {
    // Clear history view when switching main chat
    setSelectedHistoryId(null);
    setMetaTab('details');
    setOngoingChatId(chatId || null);
  }, [chatId]);

  useEffect(() => {
    if (selectedHistoryId) {
      // For now, history messages will be empty until we integrate the message API
      setHistoryMessages([]);
    } else {
      setHistoryMessages([]);
    }
  }, [selectedHistoryId]);

  const loadHistoryMessages = useCallback(async (chatIdToFetch: string, pageNum: number, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setHistoryLoading(true);
        setHasMoreHistory(true);
        setHistoryPage(1);
      } else {
        setIsFetchingOlderHistory(true);
      }

      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : 1;

      const response = await chatBotService.getChatMessages(userId, Number(chatIdToFetch), {
        limit: CHAT_LIMIT,
        page: pageNum
      });

      const chatData = (response as any).response || response.data;
      if (response.success && chatData && chatData.messages) {
        const rawMsgs = chatData.messages || [];
        const mappedHistory: ChatMessage[] = rawMsgs.map((m: any) => {
          const isAudio = m.file_path && /\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(m.file_path);
          return {
            id: m.id.toString(),
            author: formatMessageAuthor(m, userId),
            isClient: m.messager === 'client',
            isWhisper: m.message_type === 'private message' || m.message_type === 'whisper',
            content: m.message,
            timestamp: m.created_at,
            type: (m.message_type === 'private log' || m.message_type === 'public log') ? 'system' : (isAudio ? 'audio' : (m.file_path ? 'file' : 'text')),
            filePath: m.file_path,
            fileName: m.file_path ? m.file_path.split('/').pop()?.split('?')[0] : undefined,
            pageRoute: m.current_page || '',
            profilePic: m.staff?.profile_pic ? m.staff.profile_pic.replace(/^\\+/, '') : undefined,
            staffId: m.messaged_as || undefined
          };
        }).reverse();

        if (mappedHistory.length < CHAT_LIMIT) {
          setHasMoreHistory(false);
        }

        setHistoryMessages(prev => {
          if (isInitial) return mappedHistory;
          return [...mappedHistory, ...prev];
        });
      }
    } catch (error) {
      console.error('Error fetching history messages:', error);
      setHasMoreHistory(false);
    } finally {
      setHistoryLoading(false);
      setIsFetchingOlderHistory(false);
    }
  }, [staffList]);

  const handleHistoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!selectedHistoryId || !hasMoreHistory || isFetchingOlderHistory) return;

    const target = e.currentTarget;
    if (target.scrollTop === 0) {
      // Capture height before prepending
      const oldScrollHeight = target.scrollHeight;

      const nextPage = historyPage + 1;
      setHistoryPage(nextPage);

      loadHistoryMessages(selectedHistoryId, nextPage).then(() => {
        // Maintain scroll position
        requestAnimationFrame(() => {
          if (target) {
            target.scrollTop = target.scrollHeight - oldScrollHeight;
          }
        });
      });
    }
  };

  const handleChatSelect = (id: string, isFromHistory = false) => {
    if (!isFromHistory) {
      navigate(`/chat-bot/${id}`);
    } else {
      setSelectedHistoryId(id);
      setMetaTab('history');
      loadHistoryMessages(id, 1, true);
    }
  };
  const handleInputChange = (val: string) => {
    setNewMessage(val);
    if (saveStatus !== 'idle') setSaveStatus('idle');

    // Dynamic autoresize the textarea for mieux multi-line feedback
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }

    if (val.startsWith('/')) {
      const searchVal = val.substring(1);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const userData = localStorage.getItem('user');
          const userId = userData ? JSON.parse(userData).id : 1;
          const response = await chatBotService.getPredefinedResponses(userId, searchVal);
          if (response.success && response.data) {
            const suggestions = response.data.map(r => r.message);
            setRecommendations(suggestions);
            setShowRecommendations(suggestions.length > 0);
          } else {
            setShowRecommendations(false);
          }
        } catch (error) {
          console.error('Error fetching recommendations:', error);
          setShowRecommendations(false);
        }
      }, 300);

      setActiveRecommendationIndex(-1);
    } else {
      setShowRecommendations(false);
      setActiveRecommendationIndex(-1);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }
  };

  const selectRecommendation = (text: string) => {
    setNewMessage(text);
    setShowRecommendations(false);
    setActiveRecommendationIndex(-1);
    // Auto-focus and potentially auto-submit could go here
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSaveResponse = async () => {
    if (!newMessage.trim() || saveStatus === 'success') return;
    try {
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : 1;
      const response = await chatBotService.createPredefinedResponse(userId, newMessage.trim());
      if (response.success) {
        setSaveStatus('success');
        toast({
          title: 'Success',
          description: 'Message saved to predefined responses.'
        });
      } else {
        setSaveStatus('error');
        toast({
          title: 'Error',
          description: response.message || 'Failed to save response.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving response:', error);
      setSaveStatus('error');
      toast({
        title: 'Error',
        description: 'An error occurred while saving the response.',
        variant: 'destructive'
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isJoined) return;
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files].slice(0, 5));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isJoined) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isJoined) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0) || !activeChat) return;

    // Clear save status when sending a message
    if (saveStatus !== 'idle') setSaveStatus('idle');

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : { id: 1 };
    const userId = user.id;
    const chatIdNum = parseInt(activeChat.id);

    const messageType = responseMode === 'whisper' ? 'private message' : 'public message';
    
    const isFake = selectedStaff?.id === 'fake';
    const messagedAs = isFake ? null : (selectedStaff ? Number(selectedStaff.id) : null);
    const fakeName = isFake ? selectedStaff?.full_name : null;

    // Handle File Uploads
    if (attachedFiles.length > 0) {
      const filesToUpload = [...attachedFiles];
      const textToInclude = newMessage.trim();

      // Clear the input and files immediately in UI
      setAttachedFiles([]);
      setNewMessage('');
      setShowRecommendations(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = '42px';
      }

      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 1, full_name: 'Member' };
      const authorName = selectedStaff?.full_name || user.full_name || 'Member';
      const isWhisper = responseMode === 'whisper';

      // Create optimistic messages for all files
      const tempMessages: ChatMessage[] = filesToUpload.map(file => {
        const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav');
        const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4');
        const isImg = file.type.startsWith('image/');
        return {
          id: `temp-${Math.random().toString(36).substr(2, 9)}`,
          author: `${authorName}${selectedStaff && selectedStaff.id === userId ? ' (You)' : ''}`,
          isClient: false,
          isWhisper: isWhisper,
          content: '',
          timestamp: new Date().toISOString(),
          type: isAudio ? 'audio' : 'file', // Bubble will handle isImg/isVideo internally via path
          isUploading: true,
          filePath: URL.createObjectURL(file), // Local preview
          fileName: file.name,
          profilePic: selectedStaff?.profile_pic,
          staffId: messagedAs || undefined
        };
      });

      // Show optimistic messages in UI
      setMessages(prev => [...prev, ...tempMessages]);

      // Sequential uploads
      (async () => {
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const tempMsg = tempMessages[i];

          const formData = new FormData();
          formData.append('file', file);
          formData.append('data', JSON.stringify({
            message: i === 0 ? textToInclude : '', // Stick any text message to the first file
            message_type: isWhisper ? 'private message' : 'public message',
            messaged_as: messagedAs,
            fake_name: fakeName
          }));

          try {
            const response = await chatBotService.uploadFile(user.id, chatIdNum, formData) as any;
            if (response.success && (response.response?.data || response.data)) {
              const m = (response.response?.data || response.data);
              // Promote temporary message to permanent status
              setMessages(prev => prev.map(msg => msg.id === tempMsg.id ? {
                ...msg,
                id: m.id.toString(),
                filePath: m.file_path, // Switch to permanent cloud URL
                isUploading: false,
                content: m.message || ''
              } : msg));
            } else {
              throw new Error('Upload failed');
            }
          } catch (err) {
            console.error('File upload error:', err);
            setMessages(prev => prev.map(msg => msg.id === tempMsg.id ? {
              ...msg,
              isUploading: false,
              content: 'Upload failed'
            } : msg));
            toast({ title: "Upload Error", description: `Failed to upload ${file.name}`, variant: "destructive" });
          } finally {
            // Cleanup local URL after a safety delay
            setTimeout(() => URL.revokeObjectURL(tempMsg.filePath!), 5000);
          }
        }
      })();
      return;
    }

    // Standard WebSocket Message (No attachments)
    if (!messagingSocketRef.current || messagingSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not available for transmission');
      toast({ title: "Connection Error", description: "Message transmission unavailable. Re-syncing...", variant: "destructive" });
      return;
    }

    const payload = {
      message: newMessage.trim(),
      message_type: messageType,
      messaged_as: messagedAs,
      fake_name: fakeName
    };

    try {
      messagingSocketRef.current.send(JSON.stringify(payload));
      setNewMessage('');
      setShowRecommendations(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = '42px';
      }
    } catch (err) {
      console.error('Failed to transmit message:', err);
      toast({ title: "Transmission Error", description: "Failed to send message over WebSocket.", variant: "destructive" });
    }
  };

  const handleToggleJoin = async () => {
    if (!activeChat) return;

    const newStatus = !isJoined;
    const action = newStatus ? 'join' : 'leave';

    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 1 };
      const userId = user.id;

      const isFake = selectedStaff?.id === 'fake';
      const messagedAs = isFake ? undefined : (selectedStaff ? Number(selectedStaff.id) : undefined);
      const fakeName = isFake ? selectedStaff?.full_name : undefined;

      const response = await chatBotService.logChatAction(userId, parseInt(activeChat.id), action, messagedAs, fakeName);

      if (response.success) {
        setIsJoined(newStatus);

        if (newStatus) {
          // If the chat is in 'created' status, automatically accept it (mark as 'open')
          if (activeChat.status?.toLowerCase() === 'created') {
            try {
              const acceptResponse = await chatBotService.updateChatStatus(userId, parseInt(activeChat.id), 'open');
              if (acceptResponse.success) {
                setActiveChat(prev => prev ? { ...prev, status: 'Open' } : prev);
                setSidebarChats(prev => prev.map(c => c.id.toString() === activeChat.id ? { ...c, status: 'Open' } : c));
              }
            } catch (acceptErr) {
              console.error('Failed to accept chat during join:', acceptErr);
            }
          }

          // Mark as read in context (updates global state)
          markAsRead(Number(activeChat.id));
          // Keep unreadCountSnapshot so the divider stays in UI

          dispatch(joinChat({
            chatId: Number(activeChat.id),
            joinedBy: Number(userId),
            joinedAs: selectedStaff ? selectedStaff.id : userId
          }));

          toast({ title: 'Success', description: 'Chat joined and accepted successfully.' });
        } else {
          // Clear snapshot when leaving
          setUnreadCountSnapshot(0);
          dispatch(leaveChat(Number(activeChat.id)));
          toast({ title: 'Success', description: 'Chat left successfully.' });
        }
      } else {
        toast({ title: 'Error', description: response.message || `Failed to ${action} chat.`, variant: 'destructive' });
      }
    } catch (error) {
      console.error(`Error during ${action} action:`, error);
      toast({ title: 'Error', description: `An error occurred while ${action}ing the chat.`, variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showRecommendations && recommendations.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveRecommendationIndex(prev =>
          prev < recommendations.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveRecommendationIndex(prev => (prev > -1 ? prev - 1 : -1));
        return;
      }
      if (e.key === 'Enter' && activeRecommendationIndex >= 0) {
        e.preventDefault();
        selectRecommendation(recommendations[activeRecommendationIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  // Scroll history to bottom on initial load
  useEffect(() => {
    if (selectedHistoryId && historyMessages.length > 0 && historyPage === 1) {
      if (historyScrollRef.current) {
        historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
      }
    }
  }, [selectedHistoryId, historyMessages.length]);

  const handleFileDownload = (url: string, filename: string, id: string) => {
    // Trigger direct browser download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // For cross-origin or to ensure it downloads, we can use target blank 
    // but the 'download' attribute is the key for "direct" download on modern browsers.
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Briefly show the "downloading" state for UX feedback but don't hold it
    setDownloadingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1000);
  };



  const handleStatusChange = async (newStatus: string) => {
    if (!activeChat) return;
    try {
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : 1;
      const response = await chatBotService.updateChatStatus(userId, parseInt(activeChat.id), newStatus.toLowerCase());
      if (response.success) {
        setActiveChat(prev => prev ? { ...prev, status: newStatus } : prev);
        setSidebarChats(prev => prev.map(c => c.id.toString() === activeChat.id ? { ...c, status: newStatus } : c));
        toast({ title: 'Success', description: `Chat status updated to ${newStatus}.` });
      } else {
        toast({ title: 'Error', description: response.message || 'Failed to update status.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', description: 'An error occurred while updating the status.', variant: 'destructive' });
    }
  };

  // --- Memoized UI Components ---

  // Memoize Sidebar Chats to prevent background re-renders on keystroke
  const memoizedSidebarContent = useMemo(() => {
    if (sidebarLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      );
    }
    if (sidebarChats.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No chats found</p>
        </div>
      );
    }
    return sidebarChats.map((chat) => {
      const isSelected = ongoingChatId === chat.id.toString();
      const isActive = String(chat.id) === ongoingChatId && activeChat?.status ? activeChat.status : chat.status;
      return (
        <div
          key={chat.id}
          onClick={() => navigate(`/chat-bot/${chat.id}`)}
          className={cn(
            "p-3 rounded-lg cursor-pointer transition-colors mb-2 gap-2 flex flex-col border",
            isSelected
              ? "bg-primary/10 border-primary/20"
              : "hover:bg-muted/50 border-transparent"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-shrink-0 rounded-sm overflow-hidden border border-border/50">
                {getCountryShortCode(chat.country) ? (
                  <img
                    src={`https://flagcdn.com/w20/${getCountryShortCode(chat.country)}.png`}
                    width="20"
                    alt="flag"
                    className="block"
                  />
                ) : (
                  <Globe className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="font-bold text-[13px] truncate tracking-tight text-foreground">
                {chat.client_name || 'Client'}
              </p>
              {unreadCounts[Number(chat.id)] > 0 && (
                <div className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full shadow-sm">
                  {unreadCounts[Number(chat.id)]}
                </div>
              )}
            </div>
            <span className={cn(
              "text-[9px] px-2 py-0.5 rounded-full font-black capitalize tracking-widest",
              getStatusBadgeSmall(isActive)
            )}>
              {(isActive || '').toLowerCase() === 'converted' ? 'Converted to Ticket' : isActive}
            </span>
          </div>
          <div>
            <p className="text-[11px] line-clamp-1 leading-relaxed italic text-muted-foreground">
              {formatSidebarPreview(chat.preview)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-muted/20">
            <div className="flex items-center gap-1.5 min-w-0">
              {chat.website?.icon ? (
                <img src={`${chat.website.icon}`} alt="" className="w-4 h-4 object-contain" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-[10px] font-bold truncate tracking-wide text-muted-foreground/80">
                {chat.website?.name || 'Unknown'}
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground/60">
              {getRelativeTime(chat.created_at)}
            </span>
          </div>
        </div>
      );
    });
  }, [sidebarLoading, sidebarChats, ongoingChatId, unreadCounts, activeChat?.status, navigate]);

  // Memoize Message List to prevent re-rendering 100+ items on every keystroke
  const memoizedMessageContent = useMemo(() => {
    if (messagesLoading && messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-sm font-medium text-muted-foreground">Loading messages...</span>
        </div>
      );
    }
    if (!messagesLoading && messages.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No messages yet</p>
        </div>
      );
    }

    const processedMessages = messages.map((msg, index) => {
      const prev = messages[index - 1];
      const next = messages[index + 1];

      const isSameWhisperAsPrev = prev && prev.isWhisper === msg.isWhisper;
      const isSameWhisperAsNext = next && next.isWhisper === msg.isWhisper;

      const isSameAuthorAsPrev = prev && prev.author === msg.author && prev.type !== 'system' && msg.type !== 'system' && isSameWhisperAsPrev;
      const isSameAuthorAsNext = next && next.author === msg.author && next.type !== 'system' && msg.type !== 'system' && isSameWhisperAsNext;

      const isSamePageAsPrev = !prev || prev.pageRoute === msg.pageRoute;
      const isSamePageAsNext = !next || next.pageRoute === msg.pageRoute;

      const isSameGroupTimeAsPrev = isSameAuthorAsPrev && isSamePageAsPrev && Math.abs(new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 120000;
      const isSameGroupTimeAsNext = isSameAuthorAsNext && isSamePageAsNext && Math.abs(new Date(next.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 120000;

      let subType: 'single' | 'group-first' | 'group-middle' | 'group-last' = 'single';
      if (isSameGroupTimeAsPrev && isSameGroupTimeAsNext) subType = 'group-middle';
      else if (isSameGroupTimeAsPrev && !isSameGroupTimeAsNext) subType = 'group-last';
      else if (!isSameGroupTimeAsPrev && isSameGroupTimeAsNext) subType = 'group-first';

      return { ...msg, subType };
    });

    return (
      <div className="space-y-0.5 px-1 py-4">
        {processedMessages.map((msg) => {
          const showDivider = firstUnreadMsgId && msg.id === firstUnreadMsgId;
          const isClient = msg.isClient;
          const isWhisper = msg.isWhisper;
          const subType = msg.subType!;

          if (msg.type === 'system') {
            return (
              <Fragment key={msg.id}>
                {showDivider && (
                  <div ref={unreadMsgRef} className="my-6">
                    <UnreadDivider />
                  </div>
                )}
                <div className="flex justify-center my-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className={cn(
                    "px-4 border border-muted-foreground/10 text-[11px] font-semibold shadow-sm text-center transition-all duration-300",
                    msg.content.includes('\n') ? "rounded-2xl py-3.5 max-w-[85%] leading-relaxed" : "rounded-full py-1.5 max-w-[90%]",
                    msg.content.toLowerCase().includes('converted into a support ticket')
                      ? "bg-primary/5 border-primary/20 text-primary/80 ring-1 ring-primary/5"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <div
                      className="whitespace-pre-wrap [&_a]:underline [&_a]:hover:opacity-80 transition-all cursor-default [&_a]:cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const anchor = target.closest('a');
                        if (anchor) {
                          const href = anchor.getAttribute('href');
                          if (href && href.includes('/support/ticket/')) {
                            e.preventDefault();
                            const parts = href.split('/');
                            const ticketId = parts[parts.length - 1];
                            if (ticketId) {
                                navigate(`/admin-support/ticket/${ticketId}`);
                            }
                          }
                        }
                      }}
                      dangerouslySetInnerHTML={{
                        __html: msg.content.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
                      }}
                    />
                  </div>
                </div>
              </Fragment>
            );
          }

          const showHeader = subType === 'single' || subType === 'group-first';
          const showFooter = subType === 'single' || subType === 'group-last';

          return (
            <Fragment key={msg.id}>
              {showDivider && (
                <div ref={unreadMsgRef} className="my-6">
                  <UnreadDivider />
                </div>
              )}
              <div
                id={`msg-${msg.id}`}
                className={cn(
                  "flex gap-2 sm:gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isClient ? "justify-start" : "flex-row-reverse",
                  `msg-container-${subType}`
                )}
              >
                {/* Avatar Column */}
                <div className="flex-shrink-0 flex flex-col items-center mt-auto mb-1">
                  {!isClient ? (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-sm border overflow-hidden transition-opacity",
                      !showFooter && "opacity-0 pointer-events-none",
                      isWhisper ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-blue-100 text-blue-600 border-blue-200"
                    )}>
                      {(() => {
                        const pic = msg.profilePic || staffList.find(s => Number(s.id) === Number(msg.staffId))?.profile_pic;
                        if (pic) return <img src={pic} alt={msg.author} className="w-full h-full object-cover" />;
                        const initials = getInitials(msg.author);
                        if (initials) return <span className="text-[11px] font-bold tracking-wider">{initials}</span>;
                        return <User className="w-5 h-5" />;
                      })()}
                    </div>
                  ) : (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-primary/10 text-primary border border-primary/20",
                      !showFooter && "opacity-0 pointer-events-none"
                    )}>
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content Column */}
                <div className={cn("flex flex-col max-w-[80%] sm:max-w-[70%]", isClient ? "items-start" : "items-end")}>
                  {showHeader && (
                    <div className={cn("flex items-center gap-2 mb-1 flex-wrap", !isClient && "flex-row-reverse")}>
                      <span className="font-semibold text-[11px] sm:text-xs tracking-tight text-foreground/70">{msg.author}</span>
                      <Badge variant={isClient ? 'default' : (isWhisper ? 'outline' : 'secondary')} className={cn("text-[9px] px-1 py-0 h-3.5 uppercase font-black", isWhisper && "bg-amber-100 text-amber-600 border-amber-200")}>
                        {isClient ? 'Client' : (isWhisper ? 'Whisper' : 'Staff')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/70 font-medium ml-1 flex items-center gap-1.5 opacity-80 backdrop-blur-sm">
                        <Clock className="w-2.5 h-2.5 opacity-50" />
                        {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  {isClient && msg.pageRoute && showHeader && (
                    <a
                      href={msg.pageRoute.startsWith('http') ? msg.pageRoute : `https://${msg.pageRoute}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-blue-500/60 italic px-1.5 py-0.5 bg-muted/40 rounded border border-muted/50 mb-1 max-w-fit truncate hover:bg-muted/60 hover:text-blue-500 transition-all duration-200 block"
                    >
                      {msg.pageRoute}
                    </a>
                  )}

                  <div className={cn(
                    "flex flex-col max-w-full overflow-hidden shadow-sm border-[0.5px] transition-all duration-300",
                    msg.content && "has-content",
                    isClient ? ("bg-card border-border/40 " + (subType === 'single' ? 'msg-bubble-single' : `client-${subType}`)) : (cn(isWhisper ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 border-[0.5px]" : "bg-primary border-white/10 text-primary-foreground shadow-primary/10", subType === 'single' ? 'msg-bubble-single' : `staff-${subType}`)))
                  }>
                    {msg.filePath && (
                      <div className="p-1">
                        <div className="media-wrapper">
                          {(() => {
                            const path = msg.filePath!;
                            const isImg = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(path);
                            const isVideo = /\.(mp4|webm|avi|mov)(\?.*)?$/i.test(path);
                            const isAudio = /\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(path);
                            const isPDF = /\.pdf(\?.*)?$/i.test(path);
                            const isExcel = /\.(xlsx|xls|csv)(\?.*)?$/i.test(path);

                            if (isImg) {
                              return (
                                <div className="lc-media-wrapper group/img relative bg-muted/20 animate-pulse min-h-[160px] min-w-[200px] flex items-center justify-center rounded-lg overflow-hidden">
                                  {msg.isUploading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}
                                  <img
                                    src={path}
                                    alt={msg.fileName}
                                    className="w-full h-auto max-w-[260px] block cursor-pointer hover:opacity-95 transition-all opacity-0 duration-300 translate-y-2"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0', 'translate-y-2');
                                      e.currentTarget.parentElement?.classList.remove('animate-pulse', 'min-h-[160px]');
                                    }}
                                    onClick={() => {
                                      if (msg.isUploading) return;
                                      setLightboxMedia({ url: path, type: 'image' });
                                      setIsLightboxOpen(true);
                                    }}
                                  />
                                  <div className="absolute bottom-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 backdrop-blur-sm border border-white/10"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {downloadingIds.has(msg.id) ? (
                                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                          ) : (
                                            <MoreVertical className="w-4 h-4" />
                                          )}
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handleFileDownload(path, msg.fileName || 'image.jpg', msg.id);
                                        }}>
                                          <Download className="w-4 h-4 mr-2" /> Download
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              );
                            }

                            if (isVideo) {
                              return (
                                <div className="lc-media-wrapper group/vid relative bg-black/90 animate-pulse min-h-[200px] min-w-[240px] flex items-center justify-center cursor-pointer overflow-hidden rounded-lg bg-black" onClick={(e) => {
                                  if (msg.isUploading) return;
                                  const video = e.currentTarget.querySelector('video');
                                  if (video) video.paused ? video.play() : video.pause();
                                }}>
                                  {msg.isUploading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                      <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}
                                  <video
                                    src={path}
                                    className="w-full h-auto max-w-sm max-h-[300px] bg-black block shadow-inner object-cover opacity-0 transition-opacity duration-300"
                                    preload="metadata"
                                    onPlay={(e) => e.currentTarget.parentElement?.querySelector('.lc-vid-play-overlay')?.classList.add('opacity-0')}
                                    onPause={(e) => e.currentTarget.parentElement?.querySelector('.lc-vid-play-overlay')?.classList.remove('opacity-0')}
                                    onEnded={(e) => e.currentTarget.parentElement?.querySelector('.lc-vid-play-overlay')?.classList.remove('opacity-0')}
                                    onLoadedMetadata={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.parentElement?.classList.remove('animate-pulse', 'min-h-[200px]');

                                      const video = e.currentTarget;
                                      const s = Math.floor(video.duration % 60);
                                      const m = Math.floor(video.duration / 60);
                                      const durationStr = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                                      const durationBadge = video.parentElement?.querySelector('.lc-vid-duration');
                                      if (durationBadge) durationBadge.textContent = durationStr;
                                    }}
                                  />

                                  {/* Play Icon Middle */}
                                  <div className="lc-vid-play-overlay absolute inset-0 flex items-center justify-center bg-black/10 group-hover/vid:bg-black/30 transition-all pointer-events-none">
                                    <div className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center shadow-lg transform group-hover/vid:scale-110 transition-transform">
                                      <Play className="w-5 h-5 fill-current ml-0.5" />
                                    </div>
                                  </div>

                                  {/* Duration Badge Bottom-Left */}
                                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded backdrop-blur-sm pointer-events-none lc-vid-duration">
                                    00:00
                                  </div>

                                  {/* Overlays top-right and bottom-right */}
                                  <div className="lc-vid-overlay absolute inset-0 opacity-0 group-hover/vid:opacity-100 transition-opacity pointer-events-none">
                                    {/* Fullscreen icon top-right */}
                                    <div
                                      className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-md backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors pointer-events-auto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const video = e.currentTarget.parentElement?.parentElement?.querySelector('video');
                                        if (video) {
                                          if (video.requestFullscreen) {
                                            video.requestFullscreen();
                                          } else if ((video as any).webkitRequestFullscreen) {
                                            (video as any).webkitRequestFullscreen();
                                          } else if ((video as any).msRequestFullscreen) {
                                            (video as any).msRequestFullscreen();
                                          } else {
                                            // Fallback to lightbox
                                            setLightboxMedia({ url: path, type: 'video' });
                                            setIsLightboxOpen(true);
                                          }
                                        }
                                      }}
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Download 3-dot Bottom-Right */}
                                    <div className="absolute bottom-2 right-2 pointer-events-auto">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            className="h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 backdrop-blur-sm border border-white/10"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {downloadingIds.has(msg.id) ? (
                                              <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                            ) : (
                                              <MoreVertical className="w-4 h-4" />
                                            )}
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            handleFileDownload(path, msg.fileName || 'video.mp4', msg.id);
                                          }}>
                                            <Download className="w-4 h-4 mr-2" /> Download
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (isAudio) {
                              return <ChatBotAudioPlayer src={path} isClient={isClient} isWhisper={isWhisper ?? false} />;
                            }

                            return (
                              <div
                                className={cn(
                                  "flex items-center gap-3 p-3.5 transition-all cursor-pointer min-w-[200px] border-b border-muted/20 last:border-0",
                                  !isClient && !isWhisper ? "bg-white/10 hover:bg-white/20" : "bg-muted/40 hover:bg-muted/60"
                                )}
                                onClick={() => handleViewFile(path)}
                              >
                                <div className={cn(
                                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                  isPDF ? "bg-red-500/10 text-red-500" : (isExcel ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500")
                                )}>
                                  {msg.isUploading ? (
                                    <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    isPDF ? <Lock className="w-5 h-5" /> : (isExcel ? <Tag className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />)
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0 pr-2 flex-1">
                                  <span className={cn("text-xs font-bold line-clamp-1 break-all", !isClient && !isWhisper ? "text-white" : "text-foreground")}>{msg.fileName || 'Document'}</span>
                                  <span className={cn("text-[9px] font-black uppercase opacity-60", !isClient && !isWhisper ? "text-white/80" : "text-muted-foreground")}>
                                    {isPDF ? 'PDF Document' : (isExcel ? 'Spreadsheet' : 'Attachment')}
                                  </span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 ml-auto rounded-full transition-all",
                                    !isClient && !isWhisper ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-muted-foreground"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileDownload(path, msg.fileName || 'document', msg.id);
                                  }}
                                >
                                  {downloadingIds.has(msg.id) ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                  ) : (
                                    <ArrowDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {msg.content && (
                      <div className={cn("p-3.5", msg.filePath && "pt-2")}>
                        <p className={cn(
                          "whitespace-pre-wrap leading-relaxed text-sm",
                          !isClient && !isWhisper ? "text-white" : "text-current"
                        )}>
                          {msg.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    );
  }, [messages, messagesLoading, firstUnreadMsgId, staffList, downloadingIds]);

  const memoizedHistoryContent = useMemo(() => {
    if (historyMessages.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No messages in this session</p>
        </div>
      );
    }

    const processedHistory = historyMessages.map((msg, index) => {
      const prev = historyMessages[index - 1];
      const next = historyMessages[index + 1];

      const isSameWhisperAsPrev = prev && prev.isWhisper === msg.isWhisper;
      const isSameWhisperAsNext = next && next.isWhisper === msg.isWhisper;

      const isSameAuthorAsPrev = prev && prev.author === msg.author && prev.type !== 'system' && msg.type !== 'system' && isSameWhisperAsPrev;
      const isSameAuthorAsNext = next && next.author === msg.author && next.type !== 'system' && msg.type !== 'system' && isSameWhisperAsNext;

      const isSamePageAsPrev = !prev || prev.pageRoute === msg.pageRoute;
      const isSamePageAsNext = !next || next.pageRoute === msg.pageRoute;

      const isSameGroupTimeAsPrev = isSameAuthorAsPrev && isSamePageAsPrev && Math.abs(new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 120000;
      const isSameGroupTimeAsNext = isSameAuthorAsNext && isSamePageAsNext && Math.abs(new Date(next.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 120000;

      let subType: 'single' | 'group-first' | 'group-middle' | 'group-last' = 'single';
      if (isSameGroupTimeAsPrev && isSameGroupTimeAsNext) subType = 'group-middle';
      else if (isSameGroupTimeAsPrev && !isSameGroupTimeAsNext) subType = 'group-last';
      else if (!isSameGroupTimeAsPrev && isSameGroupTimeAsNext) subType = 'group-first';

      return { ...msg, subType };
    });

    return (
      <div className="space-y-0.5 px-1 py-4">
        {processedHistory.map((msg) => {
          const isClient = msg.isClient;
          const isWhisper = msg.isWhisper;
          const subType = msg.subType!;

          if (msg.type === 'system') {
            return (
              <Fragment key={msg.id}>
                <div className="flex justify-center my-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className={cn(
                    "px-4 border border-muted-foreground/10 text-[11px] font-semibold shadow-sm text-center transition-all duration-300",
                    msg.content.includes('\n') ? "rounded-2xl py-3.5 max-w-[85%] leading-relaxed" : "rounded-full py-1.5 max-w-[90%]",
                    msg.content.toLowerCase().includes('converted into a support ticket')
                      ? "bg-primary/5 border-primary/20 text-primary/80"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <div
                      className="whitespace-pre-wrap [&_a]:underline [&_a]:hover:opacity-80 transition-all cursor-default [&_a]:cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const anchor = target.closest('a');
                        if (anchor) {
                          const href = anchor.getAttribute('href');
                          if (href && href.includes('/support/ticket/')) {
                            e.preventDefault();
                            const parts = href.split('/');
                            const ticketId = parts[parts.length - 1];
                            if (ticketId) {
                                navigate(`/admin-support/ticket/${ticketId}`);
                            }
                          }
                        }
                      }}
                      dangerouslySetInnerHTML={{
                        __html: msg.content.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
                      }}
                    />
                  </div>
                </div>
              </Fragment>
            );
          }

          const showHeader = subType === 'single' || subType === 'group-first';
          const showFooter = subType === 'single' || subType === 'group-last';

          return (
            <Fragment key={msg.id}>
              <div
                id={`history-msg-${msg.id}`}
                className={cn(
                  "flex gap-2 sm:gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isClient ? "justify-start" : "flex-row-reverse",
                  `msg-container-${subType}`
                )}
              >
                {/* Avatar Column */}
                <div className="flex-shrink-0 flex flex-col items-center mt-auto mb-1">
                  {!isClient ? (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-sm border overflow-hidden transition-opacity",
                      !showFooter && "opacity-0 pointer-events-none",
                      isWhisper ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-blue-100 text-blue-600 border-blue-200"
                    )}>
                      {(() => {
                        const pic = msg.profilePic || staffList.find(s => Number(s.id) === Number(msg.staffId))?.profile_pic;
                        if (pic) return <img src={pic} alt={msg.author} className="w-full h-full object-cover" />;
                        const initials = getInitials(msg.author);
                        if (initials) return <span className="text-[11px] font-bold tracking-wider">{initials}</span>;
                        return <User className="w-5 h-5" />;
                      })()}
                    </div>
                  ) : (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-primary/10 text-primary border border-primary/20",
                      !showFooter && "opacity-0 pointer-events-none"
                    )}>
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content Column */}
                <div className={cn("flex flex-col max-w-[80%] sm:max-w-[70%]", isClient ? "items-start" : "items-end")}>
                  {showHeader && (
                    <div className={cn("flex items-center gap-2 mb-1 flex-wrap", !isClient && "flex-row-reverse")}>
                      <span className="font-semibold text-[11px] sm:text-xs tracking-tight text-foreground/70">{msg.author}</span>
                      <Badge variant={isClient ? 'default' : (isWhisper ? 'outline' : 'secondary')} className={cn("text-[9px] px-1 py-0 h-3.5 uppercase font-black", isWhisper && "bg-amber-100 text-amber-600 border-amber-200")}>
                        {isClient ? 'Client' : (isWhisper ? 'Whisper' : 'Staff')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/70 font-medium ml-1 flex items-center gap-1.5 opacity-80 backdrop-blur-sm">
                        <Clock className="w-2.5 h-2.5 opacity-50" />
                        {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  {isClient && msg.pageRoute && showHeader && (
                    <a
                      href={msg.pageRoute.startsWith('http') ? msg.pageRoute : `https://${msg.pageRoute}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-blue-500/60 italic px-1.5 py-0.5 bg-muted/40 rounded border border-muted/50 mb-1 max-w-fit truncate hover:bg-muted/60 hover:text-blue-500 transition-all duration-200 block"
                    >
                      {msg.pageRoute}
                    </a>
                  )}

                  <div className={cn(
                    "flex flex-col max-w-full overflow-hidden shadow-sm border-[0.5px] transition-all duration-300",
                    msg.content && "has-content",
                    isClient ? ("bg-card border-border/40 " + (subType === 'single' ? 'msg-bubble-single' : `client-${subType}`)) : (cn(isWhisper ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 border-[0.5px]" : "bg-primary border-white/10 text-primary-foreground shadow-primary/10", subType === 'single' ? 'msg-bubble-single' : `staff-${subType}`)))
                  }>
                    {msg.filePath && (
                      <div className="p-1">
                        <div className="media-wrapper">
                          {(() => {
                            const path = msg.filePath!;
                            const isImg = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(path);
                            const isVideo = /\.(mp4|webm|avi|mov)(\?.*)?$/i.test(path);
                            const isAudio = /\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(path);
                            const isPDF = /\.pdf(\?.*)?$/i.test(path);
                            const isExcel = /\.(xlsx|xls|csv)(\?.*)?$/i.test(path);

                            if (isImg) {
                              return (
                                <div className="lc-media-wrapper group/img relative bg-muted/20 animate-pulse min-h-[160px] min-w-[200px] flex items-center justify-center rounded-lg overflow-hidden">
                                  {msg.isUploading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}
                                  <img
                                    src={path}
                                    alt={msg.fileName}
                                    className="w-full h-auto max-w-[260px] block cursor-pointer hover:opacity-95 transition-all opacity-0 duration-300 translate-y-2"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0', 'translate-y-2');
                                      e.currentTarget.parentElement?.classList.remove('animate-pulse', 'min-h-[160px]');
                                    }}
                                    onClick={() => {
                                      if (msg.isUploading) return;
                                      setLightboxMedia({ url: path, type: 'image' });
                                      setIsLightboxOpen(true);
                                    }}
                                  />
                                  <div className="absolute bottom-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 backdrop-blur-sm border border-white/10"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {downloadingIds.has(msg.id) ? (
                                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                          ) : (
                                            <MoreVertical className="w-4 h-4" />
                                          )}
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          handleFileDownload(path, msg.fileName || 'image.jpg', msg.id);
                                        }}>
                                          <Download className="w-4 h-4 mr-2" /> Download
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              );
                            }

                            if (isVideo) {
                              return (
                                <div className="lc-media-wrapper group/vid relative bg-black/90 animate-pulse min-h-[200px] min-w-[240px] flex items-center justify-center cursor-pointer overflow-hidden rounded-lg bg-black" onClick={(e) => {
                                  const video = e.currentTarget.querySelector('video');
                                  if (video) video.paused ? video.play() : video.pause();
                                }}>
                                  <video
                                    src={path}
                                    className="w-full h-auto max-w-sm max-h-[300px] bg-black block shadow-inner object-cover opacity-0 transition-opacity duration-300"
                                    preload="metadata"
                                    onPlay={(e) => e.currentTarget.parentElement?.querySelector('.lc-vid-play-overlay')?.classList.add('opacity-0')}
                                    onPause={(e) => e.currentTarget.parentElement?.querySelector('.lc-vid-play-overlay')?.classList.remove('opacity-0')}
                                    onEnded={(e) => e.currentTarget.parentElement?.querySelector('.lc-vid-play-overlay')?.classList.remove('opacity-0')}
                                    onLoadedMetadata={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.parentElement?.classList.remove('animate-pulse', 'min-h-[200px]');

                                      const video = e.currentTarget;
                                      const s = Math.floor(video.duration % 60);
                                      const m = Math.floor(video.duration / 60);
                                      const durationStr = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                                      const durationBadge = video.parentElement?.querySelector('.lc-vid-duration');
                                      if (durationBadge) durationBadge.textContent = durationStr;
                                    }}
                                  />

                                  {/* Play Icon Middle */}
                                  <div className="lc-vid-play-overlay absolute inset-0 flex items-center justify-center bg-black/10 group-hover/vid:bg-black/30 transition-all pointer-events-none">
                                    <div className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center shadow-lg transform group-hover/vid:scale-110 transition-transform">
                                      <Play className="w-5 h-5 fill-current ml-0.5" />
                                    </div>
                                  </div>

                                  {/* Duration Badge Bottom-Left */}
                                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded backdrop-blur-sm pointer-events-none lc-vid-duration">
                                    00:00
                                  </div>

                                  {/* Overlays top-right and bottom-right */}
                                  <div className="lc-vid-overlay absolute inset-0 opacity-0 group-hover/vid:opacity-100 transition-opacity pointer-events-none">
                                    {/* Fullscreen icon top-right */}
                                    <div
                                      className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-md backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors pointer-events-auto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const video = e.currentTarget.parentElement?.parentElement?.querySelector('video');
                                        if (video) {
                                          if (video.requestFullscreen) {
                                            video.requestFullscreen();
                                          } else if ((video as any).webkitRequestFullscreen) {
                                            (video as any).webkitRequestFullscreen();
                                          } else if ((video as any).msRequestFullscreen) {
                                            (video as any).msRequestFullscreen();
                                          } else {
                                            // Fallback to lightbox
                                            setLightboxMedia({ url: path, type: 'video' });
                                            setIsLightboxOpen(true);
                                          }
                                        }
                                      }}
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Download 3-dot Bottom-Right */}
                                    <div className="absolute bottom-2 right-2 pointer-events-auto">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            className="h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 backdrop-blur-sm border border-white/10"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {downloadingIds.has(msg.id) ? (
                                              <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                            ) : (
                                              <MoreVertical className="w-4 h-4" />
                                            )}
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            handleFileDownload(path, msg.fileName || 'video.mp4', msg.id);
                                          }}>
                                            <Download className="w-4 h-4 mr-2" /> Download
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (isAudio) {
                              return <ChatBotAudioPlayer src={path} isClient={isClient} isWhisper={isWhisper ?? false} />;
                            }

                            return (
                              <div
                                className={cn(
                                  "flex items-center gap-3 p-3.5 transition-all cursor-pointer min-w-[200px] border-b border-muted/20 last:border-0",
                                  !isClient && !isWhisper ? "bg-white/10 hover:bg-white/20" : "bg-muted/40 hover:bg-muted/60"
                                )}
                                onClick={() => handleViewFile(path)}
                              >
                                <div className={cn(
                                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                  isPDF ? "bg-red-500/10 text-red-500" : (isExcel ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500")
                                )}>
                                  {msg.isUploading ? (
                                    <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    isPDF ? <Lock className="w-5 h-5" /> : (isExcel ? <Tag className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />)
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0 pr-2 flex-1">
                                  <span className={cn("text-xs font-bold line-clamp-1 break-all", !isClient && !isWhisper ? "text-white" : "text-foreground")}>{msg.fileName || 'Document'}</span>
                                  <span className={cn("text-[9px] font-black uppercase opacity-60", !isClient && !isWhisper ? "text-white/80" : "text-muted-foreground")}>
                                    {isPDF ? 'PDF Document' : (isExcel ? 'Spreadsheet' : 'Attachment')}
                                  </span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 ml-auto rounded-full transition-all",
                                    !isClient && !isWhisper ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-muted-foreground"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileDownload(path, msg.fileName || 'document', msg.id);
                                  }}
                                >
                                  {downloadingIds.has(msg.id) ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                  ) : (
                                    <ArrowDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {msg.content && (
                      <div className={cn("p-3.5", msg.filePath && "pt-2")}>
                        <p className={cn(
                          "whitespace-pre-wrap leading-relaxed text-sm",
                          !isClient && !isWhisper ? "text-white" : "text-current"
                        )}>
                          {msg.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    );
  }, [historyMessages, staffList, downloadingIds]);

  return (

    <AdminLayout title="Chat Bot">
      <>
        <style>{CUSTOM_CSS}</style>
        <div className="flex h-[calc(100vh-65px)] overflow-hidden">

          {/* Sidebar Chat List */}
          <div
            className={cn(
              "hidden lg:flex border-r bg-background flex-col flex-shrink-0 relative transition-all duration-200",
              isSidebarCollapsed ? "lg:w-14" : "lg:w-80 xl:w-96"
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="absolute -right-3 top-3 h-7 w-7 rounded-full border bg-background shadow-sm z-10"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            {!isSidebarCollapsed && (
              <>
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea
                  className="flex-1"
                  onScroll={handleSidebarScroll}
                >
                  <div className="p-2">
                    <div className="space-y-1">
                      {memoizedSidebarContent}
                    </div>
                    {isFetchingOlderSidebar && (
                      <div className="flex flex-col items-center justify-center py-4 gap-2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-muted-foreground animate-pulse">Loading more chats...</span>
                      </div>
                    )}
                    {!hasMoreSidebar && sidebarChats.length > 0 && (
                      <p className="text-[10px] text-center text-muted-foreground/30 py-4 italic">End of chat list</p>
                    )}
                  </div>
                </ScrollArea>

              </>
            )}
          </div>
          <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
            {!activeChat ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Chat Selected</h3>
                <p className="text-muted-foreground text-sm max-w-xs text-center">
                  Select a conversation from the sidebar to view details and start responding.
                </p>
              </div>
            ) : (
              <div className="p-3 sm:p-4 md:p-6 flex-1 flex flex-col overflow-hidden space-y-4 text-left">
                {/* Client Info Card */}
                <Card className="shadow-sm text-left">
                  <CardHeader className="py-4 px-4 sm:px-6 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 border-b pb-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1 sm:mb-2">
                          <CardTitle className="text-lg sm:text-xl font-bold line-clamp-2">{activeChat.name}</CardTitle>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{activeChat.email || 'No email provided'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                        <Select
                          value={activeChat.status}
                          onValueChange={(val) => handleStatusChange(val)}
                          disabled={activeChat.status.toLowerCase() === 'converted'}
                        >
                          <SelectTrigger className={cn(
                            "h-auto w-auto p-0 border-0 bg-transparent hover:bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 outline-none flex items-center gap-0",
                            activeChat.status.toLowerCase() === 'converted' ? "cursor-default [&>svg]:hidden" : "cursor-pointer"
                          )}>
                            {getStatusBadge(activeChat.status)}
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wide">Website</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeChat.website?.icon ? (
                            <img src={activeChat.website.icon} alt={activeChat.website.name} className="w-6 h-6 object-contain" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <p className="text-xs sm:text-sm font-semibold capitalize">{activeChat.website?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wide">Departments</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] uppercase">{activeChat.department || 'Support'}</Badge>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wide">Region</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeChat.countryCode && (
                            <img
                              src={`https://flagcdn.com/w20/${activeChat.countryCode.toLowerCase()}.png`}
                              width="28"
                              alt={activeChat.countryCode}
                              className="rounded-sm"
                            />
                          )}
                          <p className="text-xs sm:text-sm font-medium uppercase">{activeChat.countryCode}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wide">Created</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium">{formatDate(activeChat.time)}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                  {/* Ongoing Chat Pane */}
                  <Card className={cn("flex flex-col shadow-sm overflow-hidden min-h-0 relative transition-all duration-300", selectedHistoryId ? "flex-[1.2]" : "flex-1")}>
                    <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b bg-background z-20 sticky top-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                          <CardTitle className="text-base sm:text-lg">Chat Conversation</CardTitle>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">

                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <p>
                              Last Response: <span className="text-primary hover:underline cursor-pointer font-medium">
                                {messages.length > 0 ? formatDate(messages[messages.length - 1].timestamp) : formatDate(activeChat.time)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-8 w-8 text-muted-foreground transition-colors", showClientMeta && "text-primary bg-primary/10")}
                          onClick={() => setShowClientMeta(!showClientMeta)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative group min-h-0" onDragOver={handleDragOver}>
                      {/* Drag and Drop Overlay */}
                      {isDragging && isJoined && (
                        <div
                          className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-primary/50 flex flex-col items-center justify-center animate-in fade-in duration-200"
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <div className="bg-background/80 p-6 rounded-2xl shadow-xl border flex flex-col items-center gap-4 scale-110">
                            <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center text-primary animate-bounce">
                              <Plus size={32} />
                            </div>
                            <div className="text-center">
                              <h3 className="font-bold text-lg">Drop files to send</h3>
                              <p className="text-sm text-muted-foreground">You can send up to 5 files at a time</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="absolute inset-0 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 hide-scrollbar"
                        style={SCROLLBAR_HIDE_STYLE}
                      >
                        <div className="space-y-4">
                          {hasMore && (
                            <div className="flex justify-center py-4">
                              {isFetchingOlder ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  Loading older messages...
                                </div>
                              ) : (
                                <div className="h-10 text-xs text-muted-foreground/30 flex items-center justify-center italic">
                                  Scroll up to load history
                                </div>
                              )}
                            </div>
                          )}
                          {memoizedMessageContent}
                        </div>

                      </div>

                      {/* Scroll to bottom button - centered at bottom profile */}
                      {showScrollButton && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full shadow-lg animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200 relative"
                            onClick={() => scrollToBottom('smooth')}
                          >
                            <ArrowDown className="h-4 w-4" />
                            {unreadBelowIds.length > 0 && (
                              <Badge className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 hover:bg-red-600 text-[10px] font-bold text-white border-2 border-background flex items-center justify-center rounded-full animate-in zoom-in shadow-md">
                                {unreadBelowIds.length}
                              </Badge>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>

                    {/* Backdrop for outside click */}
                    {showClientMeta && (
                      <div
                        className="absolute inset-0 bg-black/5 z-30 transition-opacity animate-in fade-in duration-300 cursor-pointer"
                        onClick={() => setShowClientMeta(false)}
                      />
                    )}

                    {/* Client Details Off-canvas */}
                    <div className={cn(
                      "absolute inset-y-0 right-0 w-full sm:w-80 bg-background border-l shadow-2xl z-40 transition-transform duration-300 ease-in-out transform flex flex-col",
                      showClientMeta ? "translate-x-0" : "translate-x-full ml-auto"
                    )}>
                      <div className="p-4 border-b bg-muted/40 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            <h3 className="font-semibold text-sm">Client Information</h3>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowClientMeta(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center p-1 bg-muted rounded-lg border">
                          <button
                            onClick={() => setMetaTab('details')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                              metaTab === 'details' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Info className="h-3.5 w-3.5" />
                            Details
                          </button>
                          <button
                            onClick={() => setMetaTab('history')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                              metaTab === 'history' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                          </button>
                        </div>
                      </div>

                      <ScrollArea className="flex-1">
                        <div className="p-4">
                          {metaTab === 'details' ? (
                            <div className="space-y-6">
                              {/* Device Info */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Device Information</p>
                                <div className="grid gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 bg-blue-500/10 text-blue-500 rounded-md">
                                      <Monitor className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium">{activeChat.device}</p>
                                      <p className="text-[10px] text-muted-foreground">Operating System</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 bg-green-500/10 text-green-500 rounded-md">
                                      <Globe className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium">{activeChat.browser}</p>
                                      <p className="text-[10px] text-muted-foreground">Browser Engine</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Network Info */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Network & Security</p>
                                <div className="grid gap-3 p-3 rounded-lg border bg-muted/10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                                      <span className="text-xs text-muted-foreground">IP Address</span>
                                    </div>
                                    <span className="text-xs font-mono font-medium">{activeChat.ip_address}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 text-left">
                              {sidebarChats.find(c => c.id.toString() === ongoingChatId) && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ongoing Chat</p>
                                  {sidebarChats.filter(c => c.id.toString() === ongoingChatId).map((chat) => (
                                    <div
                                      key={`ongoing-${chat.id}`}
                                      onClick={() => handleChatSelect(chat.id.toString(), false)}
                                      className={cn(
                                        "p-3 rounded-lg border-2 border-primary bg-primary/5 text-left transition-all cursor-pointer shadow-sm",
                                        chat.id.toString() === ongoingChatId && "bg-primary/10"
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                          <Clock className="w-3 h-3" />
                                          Active Now
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{getRelativeTime(chat.created_at)}</span>
                                      </div>
                                      <p className="text-xs font-medium line-clamp-1">{chat.client?.name || 'Customer'}</p>
                                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{chat.preview}</p>
                                        <div className="flex items-center gap-1.5 min-w-0">

                                          {chat.website?.icon ? (
                                            <img src={`${chat.website.icon}`} alt="" className="w-3.5 h-3.5 object-contain" />
                                          ) : (
                                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                          )}
                                          <span className="text-[10px] font-semibold text-muted-foreground truncate capitalize tracking-tight">
                                            {chat.website?.name || 'Unknown'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent History</p>
                                <div className="grid gap-2">
                                  {historyLoading ? (
                                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                      <span className="text-xs text-muted-foreground">Loading history...</span>
                                    </div>
                                  ) : historyChats.length === 0 ? (
                                    <div className="text-center p-8 text-xs text-muted-foreground italic">
                                      No history found for this email
                                    </div>
                                  ) : (
                                    historyChats.filter(c => c.id.toString() !== ongoingChatId).map((chat) => (
                                      <div
                                        key={chat.id}
                                        onClick={() => handleChatSelect(chat.id.toString(), true)}
                                        className={cn(
                                          "group p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                                          chat.id.toString() === selectedHistoryId
                                            ? "bg-primary/[0.06] border-primary/30 shadow-sm"
                                            : "hover:bg-muted/50 border-transparent hover:border-muted/80"
                                        )}
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <p className="text-xs font-bold text-foreground/90 truncate min-w-0">
                                            {chat.client_name || 'Customer'}
                                          </p>
                                          <Badge variant="outline" className={cn(
                                            "h-4 text-[8px] px-1.5 font-black uppercase tracking-widest border-0",
                                            getStatusBadgeSmall(chat.status)
                                          )}>
                                            {(chat.status || '').toLowerCase() === 'converted' ? 'Converted to Ticket' : chat.status}
                                          </Badge>

                                        </div>

                                        <p className="text-[11px] text-muted-foreground/90 line-clamp-1 leading-relaxed italic mb-2">
                                          {formatSidebarPreview(chat.preview)}
                                        </p>

                                        <div className="flex items-center justify-between gap-2 border-t border-muted/10">
                                          <div className="flex items-center gap-1.5 min-w-0">

                                            {chat.website?.icon ? (
                                              <img src={`${chat.website.icon}`} alt="" className="w-3.5 h-3.5 object-contain" />
                                            ) : (
                                              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <span className="text-[10px] font-semibold text-muted-foreground truncate capitalize tracking-tight">
                                              {chat.website?.name || 'Unknown'}
                                            </span>
                                          </div>

                                          <span className="text-[10px] text-muted-foreground ml-2">
                                            {getRelativeTime(chat.created_at)}
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="p-3 sm:px-6 pt-0 bg-background border-t">
                      <div className="flex flex-col gap-2 py-3">
                        {/* Multiple File Preview Area */}
                        {attachedFiles.length > 0 && !isRecording && (
                          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/20 rounded-lg border border-dashed animate-in fade-in slide-in-from-bottom-1">
                            {attachedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-background border px-2 py-1 rounded-md shadow-sm text-xs group">
                                <Paperclip className="h-3 w-3 text-blue-500" />
                                <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                                <button
                                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {attachedFiles.length < 5 && (
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary transition-colors border border-dashed rounded-md"
                              >
                                <Plus className="h-3 w-3" />
                                Add more
                              </button>
                            )}
                          </div>
                        )}

                        {/* Main Interaction Row */}
                        <div className="flex items-end gap-2 mt-1">
                          {!isRecording && (
                            <div className="flex items-center bg-muted/40 rounded-[10px] border p-1.5 px-2 shadow-sm min-h-[54px] animate-in fade-in slide-in-from-left-2">
                              <div className="flex items-center bg-muted/50 p-1 rounded-[10px] border border-border gap-1">
                                <button
                                  type="button"
                                  disabled={activeChat?.status?.toLowerCase() !== 'open'}
                                  onClick={() => setResponseMode('reply')}
                                  className={cn(
                                    "flex items-center gap-2 px-3 h-8 rounded-[10px] transition-all",
                                    responseMode === 'reply' ? "bg-card shadow-sm text-green-600" : "text-muted-foreground hover:text-foreground",
                                    activeChat?.status?.toLowerCase() !== 'open' && "opacity-50 cursor-not-allowed grayscale"
                                  )}
                                >
                                  <CornerUpLeft className="w-3.5 h-3.5" />
                                  <span className="text-[11px] font-bold">Reply</span>
                                </button>
                                <button
                                  onClick={() => setResponseMode('whisper')}
                                  className={cn(
                                    "flex items-center gap-2 px-3 h-8 rounded-[10px] transition-all",
                                    responseMode === 'whisper' ? "bg-card shadow-sm text-amber-600" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  <span className="text-[11px] font-bold">Whisper</span>
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex-1 relative flex items-end gap-3 bg-muted/40 rounded-[10px] border p-1.5 px-4 focus-within:border-primary/30 focus-within:bg-card transition-all min-h-[54px] shadow-sm">
                            {!isRecording && (
                              <div className="flex items-center gap-0.5 mb-0.5 shrink-0">
                                <div className="relative" ref={inputOptionsRef}>
                                  <button
                                    type="button"
                                    disabled={!isJoined}
                                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-[10px] transition-colors"
                                    onClick={() => setShowInputOptions(!showInputOptions)}
                                  >
                                    <Plus size={24} strokeWidth={2} className={cn("transition-transform duration-200", showInputOptions && "rotate-45")} />
                                  </button>

                                  {showInputOptions && (
                                    <div className="absolute bottom-full left-0 mb-4 w-44 bg-background border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                                      <button
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-medium hover:bg-muted transition-colors text-left"
                                        onClick={() => {
                                          fileInputRef.current?.click();
                                          setShowInputOptions(false);
                                        }}
                                      >
                                        <Paperclip className="h-4 w-4 text-blue-500" />
                                        Attachments
                                      </button>
                                      <button
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-medium hover:bg-muted transition-colors text-left border-t"
                                        onClick={startRecording}
                                      >
                                        <Mic className="h-4 w-4 text-red-500" />
                                        Record Audio
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex-1 flex flex-col justify-end min-h-[42px]">
                              <input
                                type="file"
                                ref={fileInputRef}
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.length) {
                                    const newFiles = Array.from(e.target.files);
                                    setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 5));
                                  }
                                }}
                              />

                              {isRecording ? (
                                <div className="flex-1 flex items-center justify-between px-1 h-11 animate-in fade-in slide-in-from-left-2 transition-all">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className={cn("w-2 h-2 rounded-[10px] bg-red-500", recordingStatus === 'recording' ? "animate-pulse" : "opacity-50")} />
                                      <span className="text-[13px] font-mono font-bold text-foreground">{formatRecordingTime(recordingTime)}</span>
                                    </div>

                                    <div className="flex items-center gap-[3px] px-2 flex-1 overflow-hidden h-8">
                                      {waveformHeights.map((h, i) => (
                                        <div
                                          key={i}
                                          className={cn(
                                            "w-[2px] bg-blue-500/60 rounded-[10px] transition-all duration-75",
                                            recordingStatus === 'recording' ? "opacity-100" : "opacity-40"
                                          )}
                                          style={{
                                            height: `${h}px`
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 ml-2">
                                    <button
                                      onClick={recordingStatus === 'recording' ? pauseRecording : resumeRecording}
                                      className="text-blue-600 hover:text-blue-700 transition-colors p-1"
                                      title={recordingStatus === 'recording' ? "Pause" : "Resume"}
                                    >
                                      {recordingStatus === 'recording' ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                                    </button>
                                    <button
                                      onClick={cancelRecording}
                                      className="text-[13px] font-semibold text-red-500 hover:text-red-700 transition-colors px-1"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {showRecommendations && (
                                    <div className="absolute bottom-full left-0 right-0 mb-4 bg-background border rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                                      {recommendations.map((rec, i) => (
                                        <div
                                          key={i}
                                          onClick={() => selectRecommendation(rec)}
                                          onMouseEnter={() => setActiveRecommendationIndex(i)}
                                          className={cn(
                                            "p-2.5 text-xs cursor-pointer transition-colors border-b last:border-b-0",
                                            activeRecommendationIndex === i ? "bg-muted" : "hover:bg-muted"
                                          )}
                                        >
                                          {rec}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <Textarea
                                    ref={textareaRef}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    disabled={!activeChat || !isJoined}
                                    rows={1}
                                    placeholder={
                                      !activeChat
                                        ? "Select a chat to message..."
                                        : !isJoined
                                          ? "Join chat to send a message..."
                                          : (activeChat?.status?.toLowerCase() === 'created' && responseMode === 'reply')
                                            ? "Accept chat to reply..."
                                            : attachedFiles.length > 0
                                              ? `Add a caption for ${attachedFiles.length} file(s)...`
                                              : (responseMode === 'whisper' ? "Staff whisper..." : "Type a message...")
                                    }
                                    value={newMessage}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    className={cn(
                                      "flex-1 min-h-[42px] max-h-[120px] py-2.5 px-2 bg-transparent border-none shadow-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none text-[14px]",
                                      responseMode === 'whisper' && "placeholder:text-amber-600/50",
                                      !activeChat && "cursor-not-allowed opacity-50"
                                    )}
                                  />
                                </>
                              )}
                            </div>

                            <div className="flex items-center mb-1 shrink-0">
                              {isRecording ? (
                                <Button
                                  onClick={handleStopAndSendRecording}
                                  size="icon"
                                  className="h-10 w-10 rounded-[10px] bg-blue-600 hover:bg-blue-700 shadow-lg shrink-0 scale-100 hover:scale-105 transition-transform"
                                >
                                  <Send className="h-5 w-5 text-white" />
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {newMessage.trim() && !newMessage.startsWith('/') && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-9 w-9 transition-all shrink-0",
                                        saveStatus === 'success' ? "text-emerald-500 bg-emerald-50" :
                                          saveStatus === 'error' ? "text-red-500 bg-red-50" :
                                            "text-slate-400 hover:text-primary hover:bg-primary/5"
                                      )}
                                      title="Save to predefined responses"
                                      onClick={handleSaveResponse}
                                    >
                                      {saveStatus === 'success' ? (
                                        <Check className="h-4.5 w-4.5 animate-in zoom-in duration-300" />
                                      ) : saveStatus === 'error' ? (
                                        <X className="h-4.5 w-4.5 animate-in zoom-in duration-300" />
                                      ) : (
                                        <Save size={18} />
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    disabled={
                                      (!newMessage.trim() && attachedFiles.length === 0) ||
                                      !activeChat ||
                                      !isJoined ||
                                      (activeChat?.status?.toLowerCase() === 'created' && responseMode === 'reply')
                                    }
                                    onClick={handleSendMessage}
                                    size="icon"
                                    className={cn(
                                      "h-10 w-10 rounded-[10px] shadow-md transition-all scale-100 hover:scale-105",
                                      responseMode === 'whisper' ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700",
                                      (activeChat?.status?.toLowerCase() === 'created' && responseMode === 'reply') && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    <Send size={20} className="text-white ml-0.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Recruiment / Join Controls - Centered for easy access */}
                        <div className="flex items-center justify-center gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
                          {/* Staff Selector */}
                          <Select
                            disabled={isJoined}
                            value={selectedStaff?.id?.toString() || ''}
                            onValueChange={handleStaffSelection}
                          >
                            <SelectTrigger className="h-9 w-auto px-4 border shadow-sm bg-background hover:bg-muted/30 text-xs gap-3 rounded-full transition-all focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 outline-none">
                              <div className="flex items-center gap-2 truncate text-muted-foreground font-medium">
                                {selectedStaff?.profile_pic ? (
                                  <img src={selectedStaff.profile_pic} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  selectedStaff?.id === 'fake' && (
                                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">🎭</span>
                                  )
                                )}
                                <span className="max-w-[120px] truncate">
                                  {selectedStaff?.id === 'fake' ? `${selectedStaff.full_name} (Temp)` : (selectedStaff?.full_name || 'Select Staff')}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent side="top" className="mb-2">
                              {staffList.map(emp => (
                                <SelectItem key={emp.id} value={emp.id.toString()} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <img src={emp.profile_pic} alt="" className="w-4 h-4 rounded-full object-cover" />
                                    <span>{emp.full_name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {selectedStaff?.id === 'fake' && (
                                <SelectItem value="fake" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">🎭</span>
                                    <span>{selectedStaff.full_name} (Temp)</span>
                                  </div>
                                </SelectItem>
                              )}
                              <SelectItem value="add-fake-name" className="text-xs text-primary font-bold hover:bg-primary/5 cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <span>🎭</span>
                                  <span>Use Temporary Name...</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Join/Leave Button */}
                          <Button
                            variant={isJoined ? "outline" : "default"}
                            size="sm"
                            className={cn(
                              "h-9 px-5 text-sm font-semibold rounded-full gap-2 transition-all shadow-sm",
                              isJoined ? "text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                            onClick={handleToggleJoin}
                          >
                            {isJoined ? <X className="h-4 w-4" /> : (activeChat.status?.toLowerCase() === 'created' ? <CheckCircle className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />)}
                            {isJoined ? "Leave" : (activeChat.status?.toLowerCase() === 'created' ? "Accept & Join" : "Join")}
                          </Button>
                        </div>


                      </div>
                    </div>
                  </Card>

                  {/* History Comparison Pane */}
                  {selectedHistoryId && (
                    <Card className="flex-1 flex flex-col shadow-sm overflow-hidden min-h-0 relative border-primary/20 bg-muted/5 animate-in slide-in-from-right-4 duration-300">
                      <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b bg-muted/10 z-20 sticky top-0">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <History className="h-4 w-4 text-muted-foreground" />
                              History View
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold bg-background">Read Only</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            onClick={() => setSelectedHistoryId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 p-0 relative group min-h-0 bg-background/50">
                        <div
                          ref={historyScrollRef}
                          onScroll={handleHistoryScroll}
                          className="absolute inset-0 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 hide-scrollbar"
                          style={SCROLLBAR_HIDE_STYLE}
                        >
                          <div className="space-y-4">
                            {hasMoreHistory ? (
                              <div className="flex justify-center py-4">
                                {isFetchingOlderHistory ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    Loading history...
                                  </div>
                                ) : (
                                  <div className="h-10 text-xs text-muted-foreground/30 flex items-center justify-center italic">
                                    Scroll up to load older messages
                                  </div>
                                )}
                              </div>
                            ) : historyMessages.length > 0 && (
                              <div className="text-center py-6 text-muted-foreground/30 italic text-[10px]">
                                Start of session history
                              </div>
                            )}
                            {memoizedHistoryContent}
                          </div>
                        </div>
                      </CardContent>
                      <div className="p-4 bg-muted/10 border-t text-center">
                        <p className="text-[11px] font-medium text-muted-foreground">This is a historical conversation and cannot be edited.</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>



        {isLightboxOpen && lightboxMedia && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-in fade-in duration-300 backdrop-blur-sm">
            <button
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[101]"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X size={24} />
            </button>

            <div className="relative group/lightbox">
              {lightboxMedia.type === 'image' ? (
                <img
                  src={lightboxMedia.url}
                  alt="Full Size"
                  className="max-h-screen max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-300 rounded-lg sm:max-h-[96vh] sm:max-w-[96vw]"
                />
              ) : (
                <video
                  src={lightboxMedia.url}
                  controls
                  autoPlay
                  className="max-h-screen max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-300 rounded-lg bg-black sm:max-h-[96vh] sm:max-w-[96vw]"
                />
              )}

              <div className="absolute bottom-4 right-4 animate-in slide-in-from-bottom-2 duration-300">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/40 hover:bg-black/60 rounded-full text-white border border-white/10 backdrop-blur-md">
                      <MoreVertical size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-muted/20">
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer font-medium"
                      onClick={() => handleFileDownload(lightboxMedia.url, lightboxMedia.type === 'image' ? 'image.jpg' : 'video.mp4', 'lightbox')}
                    >
                      <Download size={16} className="text-primary" />
                      Download {lightboxMedia.type === 'image' ? 'Image' : 'Video'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showFakeNameDialog} onOpenChange={setShowFakeNameDialog}>
          <DialogContent className="max-w-sm p-6 bg-background border border-border shadow-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Use Temporary Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">
                Enter a custom name to reply as. This is temporary and applies only to this chat session.
              </p>
              <Input
                placeholder="e.g. Support Agent"
                value={tempFakeName}
                onChange={(e) => setTempFakeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFakeName()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFakeNameDialog(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveFakeName} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    </AdminLayout>
  );
}

