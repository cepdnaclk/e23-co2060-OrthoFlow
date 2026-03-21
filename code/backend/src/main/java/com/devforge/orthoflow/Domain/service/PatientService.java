package com.devforge.orthoflow.Domain.service;

import com.devforge.orthoflow.Application.dto.request.CreatePatientDto;
import com.devforge.orthoflow.Application.dto.response.PatientGeneralDto;
import com.devforge.orthoflow.Domain.entity.patient.Patient;
import com.devforge.orthoflow.Domain.exception.PatientNotFoundException;
import com.devforge.orthoflow.External.repository.PatientRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class PatientService {
    @Autowired
    private PatientRepository patientRepository;
    @Autowired
    private ModelMapper modelMapper;


    public ResponseEntity<PatientGeneralDto> getPatient(Integer id) {
       // PatientGeneralDto patientGeneralDto = new PatientGeneralDto();

        Optional<Patient> optionalPatients = patientRepository.findById(id);

        if (optionalPatients.isPresent()){

            PatientGeneralDto patientGeneralDto = modelMapper.map(optionalPatients.get(), PatientGeneralDto.class);
            return ResponseEntity.ok(patientGeneralDto);
        }else{
            throw new PatientNotFoundException("Patient not found");
        }
    }

    public ResponseEntity<CreatePatientDto> registerPatient(CreatePatientDto createPatientDto) {

        patientRepository.save(modelMapper.map(createPatientDto , Patient.class));

        return ResponseEntity.status(201).build();
    }

    public ResponseEntity<String> deletePatient(Integer id) {

        Optional<Patient> optionalPatients = patientRepository.findById(id);
        if (optionalPatients.isPresent()){
            patientRepository.deleteById(id);
            return ResponseEntity.ok("Patiennt Deleted");
        }else {
            throw new PatientNotFoundException("Patient not found");
        }
    }

//    public ResponseEntity<CreatePatientDto> updatePatient(CreatePatientDto createPatientDto) {
//        Optional<Patients> optionalPatients = patientRepository.findById(id);
//        if (optionalPatients.isPresent()){
//            Patients patients = optionalPatients.get();
//            patients.setFirstName(name);
//            patientRepository.save(patients);
//            return ResponseEntity.ok("Patient Updated");
//        }else{
//            throw new PatientNotFoundException("Patient not found");
//        }
//    }

    public Page<PatientGeneralDto> getAllUsers(Integer page, Integer size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Patient> patientPage = patientRepository.findAll(pageable);

        return patientPage.map(patient -> modelMapper.map(patient, PatientGeneralDto.class));

        //page → zero-based index (0 = first page).
        //
        //size → number of records per page.
    }
}
