package com.devforge.orthoflow.Application.controllers;

import com.devforge.orthoflow.Application.dto.request.CreatePatientDto;
import com.devforge.orthoflow.Application.dto.response.PatientGeneralDto;
import com.devforge.orthoflow.Domain.service.JWTService;
import com.devforge.orthoflow.Domain.service.PatientService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import lombok.AllArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping("/patient")
@AllArgsConstructor
public class PatientController {
    @Autowired
    private PatientService patientService;

    @Autowired
    private JWTService jwtService;

    //Get Patient
    @GetMapping("/get")
    public ResponseEntity<PatientGeneralDto> getPatient(@RequestParam Integer id) {
        return patientService.getPatient(id);

    }

    //Register Patient
    @PostMapping("/register")
    public ResponseEntity<CreatePatientDto> registerPatient(@RequestBody CreatePatientDto createPatientDto) {
        return patientService.registerPatient(createPatientDto);
    }

    //Delete Patient
    @DeleteMapping("/delete")
    public ResponseEntity<String> deletePatient(@RequestParam Integer id){

        return  patientService.deletePatient(id);
    }

//    @PutMapping("/update")
//    public ResponseEntity<CreatePatientDto> updatePatient(@RequestBody CreatePatientDto createPatientDto){
//        return patientService.updatePatient(createPatientDto);
//    }

    // Get Patients
    @GetMapping("/patients")
    public Page<PatientGeneralDto> getAllPatients(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {

        return patientService.getAllUsers(page, size);
    }

    //Test
    @GetMapping("/jwt")
    public String login(){
        return jwtService.getJWTtoken();
    }

    @GetMapping("/nirod")
    public String nirod(@RequestParam String token){
        return jwtService.parseToken(token);
    }
}
