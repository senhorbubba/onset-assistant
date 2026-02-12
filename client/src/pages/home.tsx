import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquareText, ShieldQuestion, ArrowRight, BookOpen, Zap, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import onsetLogo from "@assets/ONSET_ELEMENTOS_Prancheta_1_1770928342014.png";

export default function Home() {
  const [topic, setTopic] = useState<string>("");

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-foreground">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl opacity-60" />
      </div>

      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={onsetLogo} alt="Onset" className="w-10 h-10 rounded-lg" />
          <h1 className="text-xl font-bold font-display tracking-tight">Onset</h1>
        </div>
        
        <Link href="/admin">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Admin Panel
          </Button>
        </Link>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
        {!topic ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center max-w-2xl"
          >
            <div className="mb-6 p-4 rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rotate-3">
              <MessageSquareText className="w-12 h-12 text-primary" />
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold font-display text-slate-900 mb-6 tracking-tight leading-tight">
              Instant answers,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                zero waiting.
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
              Select a topic below to start chatting with our intelligent assistant. Get answers instantly from our curated knowledge base.
            </p>

            <div className="w-full max-w-xs space-y-4">
              <div className="bg-white p-1 rounded-xl shadow-lg border border-slate-100">
                <Select onValueChange={(val) => setTopic(val)}>
                  <SelectTrigger className="w-full h-12 border-none bg-transparent focus:ring-0 text-base">
                    <SelectValue placeholder="Select a topic to begin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AI Skills">AI Skills</SelectItem>
                    <SelectItem value="Communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <ShieldQuestion className="w-4 h-4" />
                <span>Responses verified by experts</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full max-w-4xl mb-6 flex justify-between items-center">
              <Button 
                variant="ghost" 
                onClick={() => setTopic("")}
                className="text-muted-foreground hover:text-foreground -ml-4"
              >
                ← Choose another topic
              </Button>
            </div>
            
            <ChatInterface topic={topic} />
          </motion.div>
        )}
      </main>

      {/* Features Grid (Only show on landing) */}
      {!topic && (
        <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Curated Knowledge", 
                desc: "Every answer is sourced from verified content in our database.",
                icon: BookOpen 
              },
              { 
                title: "Smart Matching", 
                desc: "Uses keyword analysis to find the most relevant answers instantly.",
                icon: Zap 
              },
              { 
                title: "Always Learning", 
                desc: "Unanswered questions are logged for review by human experts.",
                icon: BrainCircuit 
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 p-2 bg-primary/10 rounded-lg w-fit">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
