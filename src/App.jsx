import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { supabase } from "./supabase";
import Nav from "./components/Nav";
import Sidebar from "./components/Sidebar";
import { IoMenuOutline } from "react-icons/io5";
function App() {
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [toggle,setToggle] = useState(false);

  const chatEndRef = useRef(null);

  const currentChat = conversations.find((c) => c.id === currentChatId);

  // if(user)
  // console.log(user.user_metadata.full_name)
  //  Get User
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
     
    };
    getUser();

  }, []);

  //  Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  //  Title generator
  const generateTitle = (text) => {
    return text.split(" ").slice(0, 4).join(" ");
  };

  // SEND MESSAGE
  const sendMessage = async () => {
    if (!message.trim() || !user) return;

    setLoading(true);

    let chat = currentChat;

    const userMessage = {
      role: "user",
      content: message,
    };

    // Create chat if not exists
    if (!chat) {
      const { data } = await supabase
        .from("chats")
        .insert({
          user_id: user.id,
          title: generateTitle(message),
        })
        .select();

      chat = {
        id: data[0].id,
        title: data[0].title,
        messages: [],
      };

      setConversations((prev) => [chat, ...prev]);
      setCurrentChatId(chat.id);
    }

    // Save user message in DB
    await supabase.from("messages").insert({
      chat_id: chat.id,
      role: "user",
      content: message,
    });

    const updatedMessages = [...(chat.messages || []), userMessage];

    // Temporary AI message (streaming)
    const tempAIMessage = {
      role: "assistant",
      content: "",
    };

    //  Update UI instantly
    setConversations((prev) =>
      prev.map((c) =>
        c.id === chat.id
          ? { ...c, messages: [...updatedMessages, tempAIMessage] }
          : c,
      ),
    );

    setMessage("");

    try {
      const res = await fetch("https://backend-ulvk.onrender.com/chat-stream/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let aiText = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (let line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            if (parsed.content) {
              aiText += parsed.content;
            }
          } catch (e) {
            console.error("JSON parse error:", e);
          }
        }

        // UPDATE UI WITH CLEAN TEXT ONLY
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== chat.id) return c;

            const msgs = [...c.messages];
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: aiText,
            };

            return { ...c, messages: msgs };
          }),
        );
      }

      // Save AI response
      await supabase.from("messages").insert({
        chat_id: chat.id,
        role: "assistant",
        content: aiText,
      });

      // Update title (DB + UI)
      const newTitle =
        chat.title === "New Chat"
          ? generateTitle(userMessage.content)
          : chat.title;

      await supabase
        .from("chats")
        .update({ title: newTitle })
        .eq("id", chat.id);

      setConversations((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, title: newTitle } : c)),
      );
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSideBar = ()=>{

    if(toggle)
    setToggle(false);
    else
    setToggle(true);

  }

  return (
    <div className="min-h-screen flex-1">
      {/* Sidebar */}

      <div className={`flex flex-col fixed md:w-1/4 h-full z-20  ${toggle?"w-40 items-start":"w-1/6 items-center"}`} >

      <div className={`absolute top-2 left-4 md:hidden block cursor-pointer`} onClick={toggleSideBar}>
        <IoMenuOutline size={30} width={40}/>
      </div>

      <Sidebar
        user={user}
        toggle={toggle}
        conversations={conversations}
        setConversations={setConversations}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
      />
      </div>


      {/* Main Chat Area */}
      <div className={`flex flex-col md:w-3/4 w-10/12 relative md:left-1/4 left-1/6 h-full`}>
           {/* Nav */}
       
       <div className="fixed w-3/4 z-10 md:block hidden">
        
        <Nav user={user} />

       </div>

     

        <div className="flex flex-row w-full md:px-10 px-5 md:py-4 py-0 justify-center sticky md:mt-12 mt-5 md:mb-12 mb-16">

          <div className="flex flex-col md:w-3/4 w-full">

            
          {/* Empty State */}
          {!currentChat && (
            <div className="text-center mt-40 text-lg text-gray-900 font-semibold">
             Hi {user && user.user_metadata.full_name} <br/> <span className="text-2xl">What are you working on?</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-col flex-1 overflow-y-auto space-y-4">
            {currentChat?.messages
              ?.filter((m) => m.role !== "system")
              .map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl max-w-3xl ${
                    m.role === "user"
                      ? "bg-blue-100 self-end"
                      : "bg-gray-100 self-start"
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 text-gray-500 uppercase">
                    {m.role}
                  </p>

                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      skipHtml={false}
                      components={{
                        h1: (props) => (
                          <h1
                            className="text-2xl font-bold mt-6 mb-3"
                            {...props}
                          />
                        ),

                        h2: (props) => (
                          <h2
                            className="text-xl font-semibold mt-5 mb-2"
                            {...props}
                          />
                        ),

                        h3: (props) => (
                          <h3
                            className="text-lg font-semibold mt-4 mb-2"
                            {...props}
                          />
                        ),

                        p: ({ children }) => (
                          <p className="mb-2 leading-7 whitespace-pre-wrap">
                            {children}
                          </p>
                        ),

                        li: (props) => (
                          <li className="ml-4 list-disc mb-1" {...props} />
                        ),

                        // HANDLE PRE DIRECTLY (CRITICAL FIX)
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 text-white p-4 rounded-xl overflow-x-auto my-4 whitespace-pre-wrap">
                            {children}
                          </pre>
                        ),

                        table: (props) => (
                          <table
                            className="table-auto border-collapse border border-gray-300 my-4"
                            {...props}
                          />
                        ),

                        th: (props) => (
                          <th
                            className="border px-3 py-2 bg-gray-100"
                            {...props}
                          />
                        ),

                        td: (props) => (
                          <td className="border px-3 py-2" {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

            <div ref={chatEndRef} />
            </div>
          </div>
  
        </div>


      <div className="fixed md:w-3/4 w-10/12 z-10 bottom-0">
      <div className="flex flex-row justify-center bg-white items-center py-3 px-3 w-full">
      {/* Input */}
          <div className="flex flex-row md:w-2/3 w-9/12 items-center bg-white border p-3 rounded-xl mt-4 fixed bottom-5">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask coding question..."
              className="w-full outline-none"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="ml-3 font-semibold hover:text-green-600"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
      </div>
    
    </div>
        
  


      </div>
    </div>
  );
}

export default App;
