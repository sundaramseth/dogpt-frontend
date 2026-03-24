import React from 'react'
import { supabase } from '../supabase';
import { useEffect } from 'react';
import { FaRegEdit } from "react-icons/fa";


function Sidebar({user, toggle, conversations, setConversations, currentChatId, setCurrentChatId}) {

    const createNewChat = async () => {
      if (!user) return;
    
      const { data } = await supabase
        .from("chats")
        .insert({
          user_id: user.id,
          title: "New Chat"
        })
        .select();
    
      const newChat = {
        id: data[0].id,
        title: data[0].title,
        messages: []
      };
    
      setConversations(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    };


    const loadMessages = async (chatId) => {
    const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

    const formattedMessages = data.map(m => ({
        role: m.role,
        content: m.content
    }));

    setConversations(prev =>
        prev.map(c =>
        c.id === chatId
            ? { ...c, messages: formattedMessages }
            : c
        )
    );
    };


    useEffect(() => {
    const loadChats = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setConversations(data);
    };

    loadChats();
  }, [user]);

    

  return (
        <div className={`h-full w-full border-r-gray-300 border-r bg-gray-100 p-4 ${toggle?"p-4":"p-0"} flex flex-col`}>

        <h1 className={`font-bold text-lg md:block hidden mt-0`}>Do GPT</h1>    
        <h1 className={`font-bold text-lg hidden ${toggle?"block mt-10":"hidden"}`}>Do GPT</h1>

        <div
          onClick={createNewChat}
          className={` text-black p-2 rounded-lg flex flex-row items-center gap-2 text-sm font-semibold md:mt-3 mt-10 ${toggle?"mt-3":"mt-10"}`}
        >
          <FaRegEdit  />
           <span className={`md:block hidden`}>New Chat</span>
          <span className={`md:hidden ${toggle?"block":"hidden"}`}>New Chat</span>
        </div>

        <div className={`mt-4 space-y-2 overflow-y-auto md:block ${toggle?"block":"hidden"}`}>
          <p className="text-xs text-gray-500">Your Chats</p>

          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => {
                setCurrentChatId(c.id) 
                loadMessages(c.id)
              }
              }
              className={`p-2 rounded cursor-pointer text-sm ${
                c.id === currentChatId
                  ? "bg-gray-300"
                  : "hover:bg-gray-100"
              }`}
            >
              {c.title}
            </div>
          ))}
        </div>
      </div>
  )
}

export default Sidebar
