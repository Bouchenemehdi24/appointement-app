import React, { useState, useEffect } from 'react';

const WaitingRoomApp = () => {
  // Available medical services with prices
  const availableServices = [
    { id: 1, name: "Consultation standard", price: 25 },
    { id: 2, name: "Prise de sang", price: 15 },
    { id: 3, name: "Radiographie", price: 45 },
    { id: 4, name: "Échographie", price: 60 },
    { id: 5, name: "Vaccination", price: 30 },
    { id: 6, name: "Électrocardiogramme", price: 40 }
  ];

  const [patients, setPatients] = useState([
    { id: 1, name: "Martin Dupont", appointmentTime: "09:30", status: "En attente", estimatedWait: 15, services: [], completionTime: null, completionDate: null },
    { id: 2, name: "Sophie Bernard", appointmentTime: "10:00", status: "En attente", estimatedWait: 30, services: [], completionTime: null, completionDate: null },
    { id: 3, name: "Thomas Petit", appointmentTime: "10:30", status: "En consultation", estimatedWait: 0, services: [], completionTime: null, completionDate: null }
  ]);
  
  const [activeTab, setActiveTab] = useState('queue');
  const [newPatientName, setNewPatientName] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [nextAvailableTime, setNextAvailableTime] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [patientInService, setPatientInService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [billingHistory, setBillingHistory] = useState({});
  
  // Update current time and date every minute
  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date();
      
      // Update time
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
      
      // Update date
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateString = `${year}-${month}-${day}`;
      setCurrentDate(dateString);
      
      // Set selected date to current date if not set yet
      if (!selectedDate) {
        setSelectedDate(dateString);
      }
    };
    
    updateTimeAndDate(); // Initial update
    const interval = setInterval(updateTimeAndDate, 60000); // Update every minute
    
    return () => clearInterval(interval); // Cleanup on unmount
  }, [selectedDate]);
  
  // Calculate next available appointment time
  useEffect(() => {
    const calculateNextAvailableTime = () => {
      // Get current time
      const now = new Date();
      let nextTime = new Date(now);
      
      // Round up to the nearest 15 minutes
      const minutes = nextTime.getMinutes();
      const remainder = minutes % 15;
      if (remainder > 0) {
        nextTime.setMinutes(minutes + (15 - remainder));
      }
      
      // Add 15 minutes buffer time from now
      nextTime.setMinutes(nextTime.getMinutes() + 15);
      
      // Get all appointment times
      const appointmentTimes = patients
        .map(p => p.appointmentTime)
        .sort();
      
      // Convert nextTime to HH:MM format
      let nextTimeStr = `${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
      
      // Find the next free 15-minute slot
      while (appointmentTimes.includes(nextTimeStr)) {
        nextTime.setMinutes(nextTime.getMinutes() + 15);
        nextTimeStr = `${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
      }
      
      setNextAvailableTime(nextTimeStr);
    };
    
    calculateNextAvailableTime();
  }, [patients]);
  
  // Recalculate waiting times
  useEffect(() => {
    const waitingPatients = patients.filter(p => p.status === "En attente");
    if (waitingPatients.length > 0) {
      let accumulatedTime = 0;
      
      const updatedPatients = patients.map(patient => {
        if (patient.status === "En attente") {
          // Each waiting patient gets 15 minutes plus accumulated time
          const estimatedWait = 15 + accumulatedTime;
          accumulatedTime += 15;
          return { ...patient, estimatedWait };
        }
        return patient;
      });
      
      setPatients(updatedPatients);
    }
  }, [patients.length, patients.filter(p => p.status === "En consultation").length]);
  
  // Update billing history whenever patients change
  useEffect(() => {
    const updateBillingHistory = () => {
      const completedPatients = patients.filter(p => p.status === "Terminé");
      
      // Group patients by completion date
      const billingByDate = {};
      
      completedPatients.forEach(patient => {
        if (patient.completionDate) {
          if (!billingByDate[patient.completionDate]) {
            billingByDate[patient.completionDate] = {
              patients: [],
              totalRevenue: 0,
              serviceCount: availableServices.reduce((acc, service) => {
                acc[service.id] = { count: 0, name: service.name, revenue: 0 };
                return acc;
              }, {})
            };
          }
          
          // Add patient to the date
          billingByDate[patient.completionDate].patients.push(patient);
          
          // Update total revenue
          const patientTotal = patient.services.reduce((total, service) => total + service.price, 0);
          billingByDate[patient.completionDate].totalRevenue += patientTotal;
          
          // Update service statistics
          patient.services.forEach(service => {
            billingByDate[patient.completionDate].serviceCount[service.id].count += 1;
            billingByDate[patient.completionDate].serviceCount[service.id].revenue += service.price;
          });
        }
      });
      
      setBillingHistory(billingByDate);
    };
    
    updateBillingHistory();
  }, [patients]);
  
  const addPatient = () => {
    if (newPatientName) {
      const newId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1;
      const newPatient = {
        id: newId,
        name: newPatientName,
        appointmentTime: nextAvailableTime,
        status: "En attente",
        estimatedWait: 20,
        services: [],
        completionTime: null,
        completionDate: null
      };
      setPatients([...patients, newPatient]);
      setNewPatientName('');
      setActiveTab('queue');
    }
  };
  
  const startConsultation = (id) => {
    setPatients(patients.map(patient => 
      patient.id === id 
        ? {...patient, status: "En consultation", estimatedWait: 0} 
        : patient
    ));
  };
  
  const openServiceModal = (patientId) => {
    setPatientInService(patientId);
    setSelectedServices([]);
    setShowServiceModal(true);
  };
  
  const handleServiceSelection = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };
  
  const completeConsultation = () => {
    if (!patientInService || selectedServices.length === 0) return;
    
    const selectedServiceDetails = availableServices.filter(service => 
      selectedServices.includes(service.id)
    );
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const completionTimeStr = `${hours}:${minutes}`;
    
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const completionDateStr = `${year}-${month}-${day}`;
    
    setPatients(patients.map(patient => 
      patient.id === patientInService 
        ? {
            ...patient, 
            status: "Terminé", 
            estimatedWait: 0,
            services: selectedServiceDetails,
            completionTime: completionTimeStr,
            completionDate: completionDateStr
          } 
        : patient
    ));
    
    setShowServiceModal(false);
    setPatientInService(null);
    setSelectedServices([]);
  };
  
  const deletePatient = (id) => {
    setPatients(patients.filter(patient => patient.id !== id));
  };
  
  const getTotalBilling = (patient) => {
    return patient.services.reduce((total, service) => total + service.price, 0);
  };
  
  // Calculate total revenue for current selected date
  const getSelectedDateRevenue = () => {
    if (!selectedDate || !billingHistory[selectedDate]) {
      return 0;
    }
    return billingHistory[selectedDate].totalRevenue;
  };
  
  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };
  
  // Get stats for most used service on selected date
  const getMostUsedService = () => {
    if (!selectedDate || !billingHistory[selectedDate]) {
      return { name: 'Aucun', count: 0 };
    }
    
    const services = billingHistory[selectedDate].serviceCount;
    let mostUsed = { name: 'Aucun', count: 0 };
    
    Object.values(services).forEach(service => {
      if (service.count > mostUsed.count) {
        mostUsed = { name: service.name, count: service.count };
      }
    });
    
    return mostUsed;
  };
  
  // Get stats for highest revenue service on selected date
  const getHighestRevenueService = () => {
    if (!selectedDate || !billingHistory[selectedDate]) {
      return { name: 'Aucun', revenue: 0 };
    }
    
    const services = billingHistory[selectedDate].serviceCount;
    let highest = { name: 'Aucun', revenue: 0 };
    
    Object.values(services).forEach(service => {
      if (service.revenue > highest.revenue) {
        highest = { name: service.name, revenue: service.revenue };
      }
    });
    
    return highest;
  };
  
  // Get all dates with completed consultations
  const getAvailableDates = () => {
    return Object.keys(billingHistory).sort().reverse();
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-800">Gestion de Salle d'Attente</h1>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex border-b">
          <button 
            className={`px-4 py-2 ${activeTab === 'queue' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('queue')}
          >
            File d'attente
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'add' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('add')}
          >
            Ajouter Patient
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'billing' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('billing')}
          >
            Facturation
          </button>
        </div>
        <div className="text-lg font-medium">
          {formatDateForDisplay(currentDate)} - {currentTime}
        </div>
      </div>
      
      {activeTab === 'queue' ? (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Patient</th>
                  <th className="py-2 px-4 text-left">Heure RDV</th>
                  <th className="py-2 px-4 text-left">Statut</th>
                  <th className="py-2 px-4 text-left">Attente Estimée</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.filter(p => p.status !== "Terminé").map(patient => (
                  <tr key={patient.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{patient.name}</td>
                    <td className="py-2 px-4">{patient.appointmentTime}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        patient.status === "En attente" ? "bg-yellow-100 text-yellow-800" :
                        patient.status === "En consultation" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      {patient.estimatedWait > 0 ? `${patient.estimatedWait} min` : '-'}
                    </td>
                    <td className="py-2 px-4">
                      {patient.status === "En attente" && (
                        <button 
                          onClick={() => startConsultation(patient.id)}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs mr-2"
                        >
                          Démarrer
                        </button>
                      )}
                      {patient.status === "En consultation" && (
                        <button 
                          onClick={() => openServiceModal(patient.id)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs mr-2"
                        >
                          Terminer
                        </button>
                      )}
                      <button 
                        onClick={() => deletePatient(patient.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 bg-blue-50 p-4 rounded">
            <h3 className="font-bold mb-2">Statistiques</h3>
            <p>Patients en attente: {patients.filter(p => p.status === "En attente").length}</p>
            <p>Patients en consultation: {patients.filter(p => p.status === "En consultation").length}</p>
            <p>Temps d'attente moyen: {
              patients.length > 0 
                ? Math.round(patients.filter(p => p.estimatedWait > 0).reduce((acc, p) => acc + p.estimatedWait, 0) / 
                  patients.filter(p => p.estimatedWait > 0).length || 0) 
                : 0
            } min</p>
          </div>
        </div>
      ) : activeTab === 'add' ? (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl mb-4 text-blue-800">Ajouter un nouveau patient</h2>
          <div className="mb-4">
            <label className="block mb-2">Nom du patient</label>
            <input 
              type="text" 
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom complet"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Heure du rendez-vous (automatique)</label>
            <div className="w-full p-2 border rounded bg-gray-100 text-gray-700">
              {nextAvailableTime}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              L'heure est calculée automatiquement en fonction des rendez-vous existants.
            </p>
          </div>
          <button 
            onClick={addPatient}
            disabled={!newPatientName}
            className={`px-4 py-2 rounded ${!newPatientName 
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Ajouter à la file d'attente
          </button>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl mb-4 text-blue-800">Facturation</h2>
          
          {/* Date Selection */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label>Date:</label>
            <select 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded"
            >
              <option value={currentDate}>Aujourd'hui ({formatDateForDisplay(currentDate)})</option>
              {getAvailableDates().filter(date => date !== currentDate).map(date => (
                <option key={date} value={date}>
                  {formatDateForDisplay(date)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Daily Statistics */}
          <div className="bg-blue-50 p-4 rounded mb-4">
            <h3 className="font-bold mb-2">Statistiques pour {formatDateForDisplay(selectedDate)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded shadow">
                <h4 className="text-sm text-gray-500">Total des revenus</h4>
                <p className="text-2xl font-bold">{getSelectedDateRevenue()} €</p>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <h4 className="text-sm text-gray-500">Patients traités</h4>
                <p className="text-2xl font-bold">
                  {selectedDate && billingHistory[selectedDate] 
                    ? billingHistory[selectedDate].patients.length 
                    : 0}
                </p>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <h4 className="text-sm text-gray-500">Revenu moyen/patient</h4>
                <p className="text-2xl font-bold">
                  {selectedDate && billingHistory[selectedDate] && billingHistory[selectedDate].patients.length > 0
                    ? Math.round(billingHistory[selectedDate].totalRevenue / billingHistory[selectedDate].patients.length)
                    : 0} €
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white p-3 rounded shadow">
                <h4 className="text-sm text-gray-500">Service le plus utilisé</h4>
                <p className="font-bold">{getMostUsedService().name}</p>
                <p>{getMostUsedService().count} fois</p>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <h4 className="text-sm text-gray-500">Service le plus rentable</h4>
                <p className="font-bold">{getHighestRevenueService().name}</p>
                <p>{getHighestRevenueService().revenue} €</p>
              </div>
            </div>
            
            {/* Services Breakdown */}
            {selectedDate && billingHistory[selectedDate] && (
              <div className="mt-4">
                <h4 className="font-bold mb-2">Répartition des services</h4>
                <div className="bg-white p-3 rounded shadow">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-2 px-2 text-left">Service</th>
                        <th className="py-2 px-2 text-center">Nombre</th>
                        <th className="py-2 px-2 text-right">Revenus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(billingHistory[selectedDate].serviceCount)
                        .filter(service => service.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((service, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2 px-2">{service.name}</td>
                            <td className="py-2 px-2 text-center">{service.count}</td>
                            <td className="py-2 px-2 text-right">{service.revenue} €</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Generate Daily Report Button */}
            <div className="mt-4 flex justify-end">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Télécharger rapport journalier
              </button>
            </div>
          </div>
          
          {/* Patient Billing Table */}
          <h3 className="font-bold mb-2">Détail des facturations</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Patient</th>
                  <th className="py-2 px-4 text-left">Heure</th>
                  <th className="py-2 px-4 text-left">Services</th>
                  <th className="py-2 px-4 text-left">Montant</th>
                </tr>
              </thead>
              <tbody>
                {selectedDate && billingHistory[selectedDate] ? 
                  billingHistory[selectedDate].patients.map(patient => (
                    <tr key={`billing-${patient.id}`} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{patient.name}</td>
                      <td className="py-2 px-4">{patient.completionTime}</td>
                      <td className="py-2 px-4">
                        <ul className="list-disc pl-5">
                          {patient.services.map(service => (
                            <li key={`service-${patient.id}-${service.id}`}>
                              {service.name} ({service.price} €)
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-2 px-4 font-bold">
                        {getTotalBilling(patient)} €
                      </td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-gray-500">
                      Aucune facturation pour cette date
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="3" className="py-2 px-4 text-right font-bold">Total</td>
                  <td className="py-2 px-4 font-bold">{getSelectedDateRevenue()} €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg shadow">
        <h3 className="font-bold mb-2 text-blue-800">Écran de la salle d'attente</h3>
        <div className="border bg-white p-4 rounded">
          <table className="min-w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="py-2 px-4 text-left">Patient</th>
                <th className="py-2 px-4 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {patients.filter(p => p.status !== "Terminé").map(patient => (
                <tr key={`display-${patient.id}`} className="border-b">
                  <td className="py-3 px-4">
                    {patient.name.split(' ')[0]} {patient.name.split(' ')[1]?.charAt(0) || ''}.
                  </td>
                  <td className="py-3 px-4">
                    {patient.status === "En consultation" ? 
                      <span className="text-green-600 font-medium">En consultation</span> : 
                      <span>En attente ({patient.estimatedWait} min)</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Service Selection Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Sélectionner les services</h2>
            <p className="mb-4 text-gray-600">
              Veuillez sélectionner les services fournis au patient
              <span className="font-medium"> 
                {patients.find(p => p.id === patientInService)?.name}
              </span>
            </p>
            
            <div className="mb-4">
              {availableServices.map(service => (
                <div key={service.id} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onChange={() => handleServiceSelection(service.id)}
                    className="mr-2"
                  />
                  <label htmlFor={`service-${service.id}`} className="flex justify-between w-full">
                    <span>{service.name}</span>
                    <span className="font-medium">{service.price} €</span>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-2 mt-2">
              <p className="font-bold flex justify-between">
                <span>Total:</span>
                <span>
                  {selectedServices.reduce((total, id) => {
                    const service = availableServices.find(s => s.id === id);
                    return total + (service ? service.price : 0);
                  }, 0)} €
                </span>
              </p>
            </div>
            
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={completeConsultation}
                disabled={selectedServices.length === 0}
                className={`px-4 py-2 rounded ${
                  selectedServices.length === 0
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                Terminer consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaitingRoomApp;