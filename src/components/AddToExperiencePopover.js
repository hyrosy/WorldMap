'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner"; // 1. Import the toast function from sonner
import { Loader2 } from 'lucide-react';

export default function AddToExperiencePopover({ pin, closePopover }) {
  const { session } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRouteName, setNewRouteName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch the user's existing routes when the component mounts
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!session?.user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, stops')
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error('Error fetching routes:', error);
      } else {
        setRoutes(data);
      }
      setLoading(false);
    };
    fetchRoutes();
  }, [session]);

  // Function to add the pin to an existing route
  const handleAddToExisting = async (route) => {
    if (route.stops.includes(pin.id)) {
        // 3. Use sonner's functional syntax
        toast.info("Already exists", { description: `This location is already in "${route.name}".` });
        closePopover();
        return;
    }

    const updatedStops = [...route.stops, pin.id];
    const { error } = await supabase
      .from('routes')
      .update({ stops: updatedStops })
      .eq('id', route.id);
    
    if (error) {
        toast.error("Error", { description: "Could not add to experience." });
    } else {
        toast.success("Success!", { description: `Added to "${route.name}".` });
    }
    closePopover();
  };

  // Function to create a new route with the current pin
  const handleCreateAndAdd = async () => {
    if (!newRouteName.trim() || !session?.user) return;
    
    setIsCreating(true);
    const { error } = await supabase
      .from('routes')
      .insert({
        name: newRouteName,
        user_id: session.user.id,
        stops: [pin.id],
      });

    if (error) {
        toast.error("Error", { description: "Could not create experience." });
    } else {
        toast.success("Success!", { description: `Created "${newRouteName}" and added location.` });
    }
    setIsCreating(false);
    closePopover();
  };


  if (loading) {
    return <div className="p-4 w-56 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-1 w-56">
        <p className="font-semibold text-sm p-2">Add to Experience</p>
        <div className="max-h-32 overflow-y-auto">
            {routes.map(route => (
                <button 
                    key={route.id} 
                    onClick={() => handleAddToExisting(route)}
                    className="w-full text-left text-sm p-2 rounded-sm hover:bg-accent"
                >
                    {route.name}
                </button>
            ))}
        </div>

        <div className="mt-2 pt-2 border-t">
            <p className="font-semibold text-sm p-2">Create New</p>
            <div className="px-2 space-y-2">
                <Input 
                    placeholder="New experience name..." 
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                />
                <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={handleCreateAndAdd}
                    disabled={isCreating}
                >
                    {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : "Create & Add"}
                </Button>
            </div>
        </div>
    </div>
  );
}