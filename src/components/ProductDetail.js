'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, Clock, User, ShoppingCart, CheckCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

const ProductDetail = ({ product, onAddToCart, onBack }) => {
    // State for booking options
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState('');
    const [participants, setParticipants] = useState(1);
    const [isAdded, setIsAdded] = useState(false);

    // Reset state when a new product is viewed
    useEffect(() => {
        setSelectedDate(new Date());
        setSelectedTime('');
        setParticipants(1);
        setIsAdded(false);
    }, [product]);

    if (!product) return null;

    const handleAddToCartClick = () => {
        const cartItemDetails = {
            quantity: product.acf?.requires_participants ? participants : 1,
            ...(product.acf?.enable_booking && {
                date: selectedDate,
                time: selectedTime,
            })
        };
        onAddToCart(product, cartItemDetails);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    const timeSlots = product.acf?.available_time_slots?.split(',').map(t => t.trim()) || [];
    const isBookable = product.acf?.enable_booking;
    const totalPrice = (parseFloat(product.price) * (isBookable && product.acf?.requires_participants ? participants : 1)).toFixed(2);

    return (
        <div className="flex flex-col h-full">
            {/* --- HEADER: GALLERY, TITLE, PRICE --- */}
            <Carousel className="w-full max-w-sm mx-auto mb-4">
              <CarouselContent>
                {product.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={image.src}
                          alt={image.alt || `Product image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            
            <h3 className="text-2xl font-bold">{product.name}</h3>
            <p className="text-3xl font-bold text-right my-2">${totalPrice}</p>
            <div 
              className="text-sm text-muted-foreground" 
              dangerouslySetInnerHTML={{ __html: product.short_description }} 
            />

            {/* --- MAIN CONTENT (SCROLLABLE) --- */}
            <div className="flex-grow overflow-y-auto pr-2 space-y-4 mt-4">
                {isBookable ? (
                    <>
                        {/* --- DATE PICKER --- */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-primary"/>
                                    Select Date
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <DayPicker
                                    mode="single" selected={selectedDate} onSelect={setSelectedDate}
                                    classNames={{
                                        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                                        day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                                        day_today: 'bg-accent text-accent-foreground',
                                        day_outside: 'text-muted-foreground opacity-50',
                                    }}
                                    disabled={{ before: new Date() }}
                                />
                            </CardContent>
                        </Card>

                        {/* --- TIME & PARTICIPANTS --- */}
                        <div className="grid grid-cols-2 gap-4">
                            {product.acf.booking_type === 'date_time' && timeSlots.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold flex items-center">
                                            <Clock className="w-4 h-4 mr-2 text-primary"/>
                                            Select Time
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-2">
                                        {timeSlots.map(time => (
                                            <Button 
                                                key={time} 
                                                onClick={() => setSelectedTime(time)}
                                                variant={selectedTime === time ? 'default' : 'outline'}
                                                className="rounded-full"
                                            >
                                                {time}
                                            </Button>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {product.acf.requires_participants && (
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold flex items-center">
                                            <User className="w-4 h-4 mr-2 text-primary"/>
                                            Participants
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex items-center justify-center gap-4">
                                        <Button size="icon" variant="outline" className="rounded-full" onClick={() => setParticipants(p => Math.max(1, p - 1))}>-</Button>
                                        <span className="font-bold text-lg w-8 text-center">{participants}</span>
                                        <Button size="icon" variant="outline" className="rounded-full" onClick={() => setParticipants(p => p + 1)}>+</Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </>
                ) : null}

                {/* --- ACCORDION FOR FULL DESCRIPTION --- */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Full Description</AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
            </div>

            {/* --- FOOTER --- */}
            <div className="mt-auto flex gap-4 border-t pt-4 flex-shrink-0">
                <Button variant="outline" onClick={onBack} className="w-1/3 rounded-full h-12">
                  Back
                </Button>
                <Button 
                    onClick={handleAddToCartClick} 
                    disabled={isAdded}
                    className={cn(
                        "w-2/3 rounded-full h-12 text-base font-semibold transition-colors bg-[#d3bc8e] text-black hover:bg-[#c8b185]",
                        { "bg-green-600 hover:bg-green-700 text-white": isAdded }
                    )}
                >
                    {isAdded ? <CheckCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                    <span className="ml-2">{isAdded ? 'Added!' : 'Add to Itinerary'}</span>
                </Button>
            </div>
        </div>
    );
};

export default ProductDetail;