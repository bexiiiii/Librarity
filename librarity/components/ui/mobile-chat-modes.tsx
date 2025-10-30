"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Sparkles,
  BookOpen,
  GraduationCap,
  Plus,
  Check,
} from "lucide-react";

type ChatMode = 'book_brain' | 'citation' | 'author' | 'coach';

interface MobileChatModesProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  availableModes?: {
    citation: boolean;
    author: boolean;
    coach: boolean;
  };
}

const modeConfig = {
  book_brain: {
    icon: MessageSquare,
    label: "General Chat",
    description: "Standard AI conversation",
    color: "text-blue-500",
  },
  citation: {
    icon: BookOpen,
    label: "Citation Mode",
    description: "With page references",
    color: "text-purple-500",
  },
  author: {
    icon: Sparkles,
    label: "Author Mode",
    description: "Author's perspective",
    color: "text-amber-500",
  },
  coach: {
    icon: GraduationCap,
    label: "Coach Mode",
    description: "Learning assistant",
    color: "text-emerald-500",
  },
};

export default function MobileChatModes({ 
  currentMode, 
  onModeChange,
  availableModes = { citation: true, author: true, coach: true }
}: MobileChatModesProps) {
  const CurrentIcon = modeConfig[currentMode].icon;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-[#ff5eb1] hover:bg-[#ff4ba8] border-0 shadow-lg"
        >
          <Plus className="h-5 w-5 text-white" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="w-72 rounded-2xl border border-white/10 bg-[#18181b]/95 backdrop-blur-xl shadow-2xl p-2"
        align="end"
        sideOffset={8}
      >
        {/* Current Mode Header */}
        <DropdownMenuLabel className="px-3 py-2 text-white/60 text-xs font-semibold uppercase tracking-wider">
          Chat Modes
        </DropdownMenuLabel>
        
        <div className="mb-2 px-2 py-3 rounded-xl bg-gradient-to-br from-[#eb6a48]/10 to-purple-500/10 border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/5 ${modeConfig[currentMode].color}`}>
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {modeConfig[currentMode].label}
              </div>
              <div className="text-xs text-white/50">
                Currently active
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Mode Options */}
        <div className="space-y-1 mt-2">
          {/* General Mode (Book Brain) */}
          <DropdownMenuItem 
            onClick={() => onModeChange('book_brain')}
            className="flex items-center gap-3 rounded-xl py-3 px-3 hover:bg-white/5 cursor-pointer focus:bg-white/5"
          >
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">General Chat</div>
              <div className="text-xs text-white/50">Standard AI conversation</div>
            </div>
            {currentMode === 'book_brain' && (
              <Check className="h-4 w-4 text-[#eb6a48]" />
            )}
          </DropdownMenuItem>

          {/* Citation Mode */}
          <DropdownMenuItem 
            onClick={() => availableModes.citation && onModeChange('citation')}
            disabled={!availableModes.citation}
            className={`flex items-center gap-3 rounded-xl py-3 px-3 cursor-pointer focus:bg-white/5 ${
              availableModes.citation 
                ? 'hover:bg-white/5' 
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div className="p-2 rounded-lg bg-purple-500/10">
              <BookOpen className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white flex items-center gap-2">
                Citation Mode
                {!availableModes.citation && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                    PRO
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50">With page references</div>
            </div>
            {currentMode === 'citation' && (
              <Check className="h-4 w-4 text-[#eb6a48]" />
            )}
          </DropdownMenuItem>

          {/* Author Mode */}
          <DropdownMenuItem 
            onClick={() => availableModes.author && onModeChange('author')}
            disabled={!availableModes.author}
            className={`flex items-center gap-3 rounded-xl py-3 px-3 cursor-pointer focus:bg-white/5 ${
              availableModes.author 
                ? 'hover:bg-white/5' 
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white flex items-center gap-2">
                Author Mode
                {!availableModes.author && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                    ULTIMATE
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50">Author's perspective</div>
            </div>
            {currentMode === 'author' && (
              <Check className="h-4 w-4 text-[#eb6a48]" />
            )}
          </DropdownMenuItem>

          {/* Coach Mode */}
          <DropdownMenuItem 
            onClick={() => availableModes.coach && onModeChange('coach')}
            disabled={!availableModes.coach}
            className={`flex items-center gap-3 rounded-xl py-3 px-3 cursor-pointer focus:bg-white/5 ${
              availableModes.coach 
                ? 'hover:bg-white/5' 
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <GraduationCap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white flex items-center gap-2">
                Coach Mode
                {!availableModes.coach && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                    PRO
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50">Learning assistant</div>
            </div>
            {currentMode === 'coach' && (
              <Check className="h-4 w-4 text-[#eb6a48]" />
            )}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
